@echo off
echo ========================================
echo NextStep RAG Documentation Ingestion
echo ========================================
echo.
echo This will ingest all documentation from ../docs
echo into the ChromaDB vector store.
echo.
echo Make sure ChromaDB is running first!
echo.
pause

echo.
echo Starting ingestion...
echo.

node scripts/ingest-documents.js ../docs

echo.
echo ========================================
echo Ingestion complete!
echo ========================================
echo.
echo Your chatbot now has access to:
echo - FAQ
echo - User guides (apply, profile, search, message, withdraw)
echo - Employer guides (post jobs, review applications)
echo - Technical documentation
echo.
pause
