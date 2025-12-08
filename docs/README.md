# Docs Folder (Reference Material)

⚠️ **Note:** This folder contains **reference material only**. 

## 📚 Active Documentation Location

**All active, up-to-date documentation is in [`../server/docs/`](../server/docs/)**

That's where you'll find:
- User guides
- Employer guides
- FAQ
- RAG chatbot documentation
- Developer guides
- Setup instructions

The RAG chatbot ingests documentation from `server/docs/`, not from this folder.

---

## 📁 What's in This Folder

### Reference Material
- **`requirements.md`** - Original project requirements and specifications
- **`requirements.txt`** - Requirements summary
- **`all-diagrams-source-files/`** - System architecture diagrams (Mermaid source)
- **`all-diagrams-image-files/`** - Exported diagram images
- **`Jest Test Cases Status.PNG`** - Test coverage screenshot

### Purpose
This folder contains:
- Original project planning documents
- Architecture diagrams for reference
- Historical requirements

---

## 🎯 Where to Go

**Looking for documentation?**
→ Go to [`../server/docs/`](../server/docs/)

**Want to use the chatbot?**
→ It uses docs from `server/docs/` automatically

**Need to add new docs?**
→ Add them to `server/docs/` and run `npm run ingest:docs`

---

## 🔄 Documentation Workflow

1. **Write docs** → Save in `server/docs/`
2. **Ingest docs** → Run `cd server && npm run ingest:docs`
3. **Test chatbot** → Ask questions in the app
4. **Get feedback** → Users click 👍/👎
5. **Improve docs** → Based on feedback
6. **Repeat** → Continuous improvement!

---

**Main Documentation:** [`../server/docs/`](../server/docs/)
