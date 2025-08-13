import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { marked } from 'marked';
import serverless from 'serverless-http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname,'..', 'views'));
app.use(express.static(path.join(__dirname,'..', 'public')));

// Markdown 處理
app.use((req, res, next) => {
  res.locals.renderMarkdown = (name) => {
    const filePath = path.join(__dirname,'..', 'public', 'md', `${name}.md`);
    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        return marked.parse(content);
    }
    return '';
  };
  next();
});

// 根路由
app.get('/', (req, res) => {
  res.render('index', { title: '主頁' });
});

// 通用 EJS 路由
app.get('/page', (req, res) => {
  const name = req.query.name;
  if (!name) return res.status(400).send('Missing page name');
  const filePath = path.join(__dirname,'..', 'views', `${name}.ejs`);
  if (!fs.existsSync(filePath)) return res.status(404).send('Page not found');
  if (name === 'port') return res.redirect('/port-list');
  res.render(name, { ...req.query });
});

// /port-list
app.get('/port-list', async (req, res) => {
  const protDir = path.join(__dirname,'..', 'public', 'prot');
  try {
    const files = await fs.readdir(protDir);
    const mdFiles = files.filter(f => f.endsWith('.md'));
    const reports = await Promise.all(mdFiles.map(async filename => {
      const [language, time, ...titleArr] = filename.replace('.md','').split('.');
      const title = titleArr.join('.');
      const content = await fs.readFile(path.join(protDir, filename), 'utf-8');
      return { language, time, title, html: marked.parse(content) };
    }));
    res.render('port-list', { reports });
  } catch(err) {
    res.status(500).send('報告目錄錯誤');
  }
});

// /port/:id
app.get('/port/:id', (req, res) => {
  const mdName = req.params.id;
  const mdPath = path.join(__dirname,'..', 'public', 'prot', `${mdName}.md`);
  if (!fs.existsSync(mdPath)) return res.status(404).send('報告不存在');
  const content = fs.readFileSync(mdPath, 'utf-8');
  const [language, time, ...titleArr] = mdName.split('.');
  const title = titleArr.join('.');
  const report = { language, time, title, html: marked.parse(content) };
  res.render('port', { reports: [report] });
});

// ✅ Vercel Serverless 要求預設導出
export default serverless(app);
