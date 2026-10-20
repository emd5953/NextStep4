const multer = require('multer');
const { randomUUID } = require('crypto');
const { unwrap } = require('../services/supabaseService.js');
const { generateEmbeddings } = require('../middleware/genAI.jsx');
const { embeddingModel } = require('../services/geminiService.js');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 2 } });
const badRequest = message => Object.assign(new Error(message), { status: 400 });

async function signedUrl(db, bucket, path) {
  if (!path) return null;
  return unwrap(await db.storage.from(bucket).createSignedUrl(path, 3600)).signedUrl;
}
const profileController = {
  async getProfile(req, res, next) {
    try {
      const p = unwrap(await req.db.from('profiles').select('*').eq('id', req.user.id).single());
      const resumes = unwrap(await req.db.from('resumes').select('*').eq('user_id', req.user.id).order('created_at', { ascending: false }).limit(1));
      const resume = resumes[0];
      res.json({ _id: p.id, full_name: p.full_name, firstName: p.first_name, lastName: p.last_name,
        email: req.user.email, phone: p.phone, location: p.location, skills: p.skills,
        encodedPhoto: await signedUrl(req.db, 'avatars', p.photo_path),
        resumeFile: resume ? { id: resume.id, originalname: resume.original_name, mimetype: resume.mime_type,
          url: await signedUrl(req.db, 'resumes', resume.storage_path) } : null });
    } catch (e) { next(e); }
  },
  async updateProfile(req, res, next) {
    const staged = [];
    let profileSaved = false;
    try {
      const current = unwrap(await req.db.from('profiles').select('*').eq('id', req.user.id).single());
      const update = { updated_at: new Date().toISOString() };
      for (const [input, column] of Object.entries({ full_name: 'full_name', firstName: 'first_name', lastName: 'last_name', phone: 'phone', location: 'location' })) {
        if (req.body[input] !== undefined) {
          if (typeof req.body[input] !== 'string' || req.body[input].length > 500) throw badRequest('Invalid profile field: ' + input);
          update[column] = req.body[input].trim();
        }
      }
      if (req.body.skills !== undefined) {
        let skills;
        try { skills = typeof req.body.skills === 'string' ? JSON.parse(req.body.skills) : req.body.skills; } catch { throw badRequest('Skills must be a list.'); }
        if (!Array.isArray(skills) || skills.length > 100 || skills.some(s => typeof s !== 'string' || s.length > 100)) throw badRequest('Skills must be a list of up to 100 short names.');
        update.skills = [...new Set(skills.map(s => s.trim()).filter(Boolean))];
      }
      // Email belongs to Auth; changing a profile must not bypass email verification.
      if (req.body.email && req.body.email !== req.user.email) throw badRequest('Email changes require account verification and are not available in this profile form.');
      if ('skills' in update || 'location' in update) {
        update.skills_embedding = null;
        update.embedding_model = null;
        const merged = { ...current, ...update };
        const text = [merged.skills.join(', '), merged.location].filter(Boolean).join(' ');
        if (text) try {
          update.skills_embedding = await generateEmbeddings(text);
          update.embedding_model = embeddingModel;
        } catch { /* Saving a profile must still work when the free AI quota is exhausted. */ }
      }
      const resume = req.files?.resume?.[0];
      const photo = req.files?.photo?.[0];
      if (resume && (resume.mimetype !== 'application/pdf' || resume.buffer.subarray(0, 5).toString() !== '%PDF-')) throw badRequest('Please upload a PDF resume.');
      if (photo && (!['image/jpeg','image/png','image/webp'].includes(photo.mimetype) || photo.size > 5 * 1024 * 1024)) throw badRequest('Photo must be a JPG, PNG, or WebP under 5 MB.');
      let resumeRow;
      for (const [bucket, file] of [['resumes', resume], ['avatars', photo]]) {
        if (!file) continue;
        const extension = bucket === 'resumes' ? 'pdf' : { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.mimetype];
        const path = req.user.id + '/' + randomUUID() + '.' + extension;
        unwrap(await req.db.storage.from(bucket).upload(path, file.buffer, { contentType: file.mimetype, upsert: false }));
        staged.push({ bucket, path });
        if (bucket === 'avatars') update.photo_path = path;
        else resumeRow = { user_id: req.user.id, storage_path: path, original_name: file.originalname, mime_type: file.mimetype, size_bytes: file.size };
      }
      if (resumeRow) unwrap(await req.db.from('resumes').insert(resumeRow));
      unwrap(await req.db.from('profiles').update(update).eq('id', req.user.id).select('id').single());
      profileSaved = true;
      if (update.photo_path && current.photo_path) await req.db.storage.from('avatars').remove([current.photo_path]);
      res.json({ message: 'Profile updated successfully' });
    } catch (e) {
      if (!profileSaved) for (const file of staged) {
        if (file.bucket === 'resumes') await req.db.from('resumes').delete().eq('storage_path', file.path).eq('user_id', req.user.id);
        await req.db.storage.from(file.bucket).remove([file.path]);
      }
      next(e);
    }
  },
  async getUserProfile(req, res, next) {
    if (req.params.userId !== req.user.id) return res.status(403).json({ error: 'Profiles are private.' });
    return profileController.getProfile(req, res, next);
  }
};
module.exports = { profileController, upload };
