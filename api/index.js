const express = require('express');// 引入 express 框架
const path = require('path');// 引入 path 模組
const fs = require('fs');// 引入 fs 模組
const marked = require('marked');// 引入 marked 模組，用於將 Markdown 轉換為 HTML
const serverless = require('serverless-http');

const app = express();
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname,'..', 'public')));// 設定靜態資源目錄
app.set('views', path.join(__dirname,'..', 'views'));// 設定視圖目錄

// 預處理 Markdown
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

app.get('/', (req, res) => {
    res.render('index', { 
        title: '主頁',
        t: req.t // 傳入翻譯函數給模板
    });
});
// 通用 EJS 渲染路由
app.get('/page', (req, res) => {
    const name = req.query.name;
    if (!name) return res.status(400).send('Missing page name');
    const filePath = path.join(__dirname, 'views', `${name}.ejs`);
    if (!fs.existsSync(filePath)) return res.status(404).send('Page not found');// 檢查文件是否存在
    // 特殊處理 port.ejs 需要 reports
    if (name === 'port') {// 重定向到報告頁面
        return res.redirect('/port-list');
    } else {
        res.render(name, { ...req.query, t: req.t });
    }
});



// 新增報告頁面路由
app.get('/port', (req, res) => {
    const protDir = path.join(__dirname,'..', 'public', 'prot');// 報告目錄
    fs.readdir(protDir, (err, files) => {// 讀取報告目錄
        if (err) return res.status(500).send('報告目錄錯誤');
        const mdFiles = files.filter(f => f.endsWith('.md'));// 過濾出 Markdown 文件
        const reports = mdFiles.map(filename => {// 將每個 Markdown 文件轉換為報告對象
            const [language, time, ...titleArr] = filename.replace('.md', '').split('.');// 分割文件名獲取語言、時間和標題
            const title = titleArr.join('.');// 將標題部分重新組合
            const content = fs.readFileSync(path.join(protDir, filename), 'utf-8');// 讀取 Markdown 文件內容
            return {
                language, time, title,
                html: marked.parse(content)
            };
        });
        res.render('port', { 
            reports, 
            title: '報告列表',
            t: req.t
        });
    });
});
app.get('/port-list', (req, res) => {// 路由 /port-list，顯示報告列表
  const protDir = path.join(__dirname,'..', 'public', 'prot');
  fs.readdir(protDir, (err, files) => {
    if (err) return res.status(500).send('報告目錄錯誤');
    const mdFiles = files.filter(f => f.endsWith('.md'));
    const reports = mdFiles.map(filename => {
      const [language, time, ...titleArr] = filename.replace('.md', '').split('.');
      const title = titleArr.join('.');
      const content = fs.readFileSync(path.join(protDir, filename), 'utf-8');
      return {
        language, time, title,
        html: require('marked').parse(content)
      };
    });
    res.render('port-list', { reports, t: req.t });
  });
});
app.get('/port/:id', (req, res) => {
    const mdName = req.params.id;
    const protDir = path.join(__dirname,'..', 'public', 'prot');
    const mdPath = path.join(protDir, `${mdName}.md`);
    if (!fs.existsSync(mdPath)) return res.status(404).send('報告不存在');
    const content = fs.readFileSync(mdPath, 'utf-8');
    const [language, time, ...titleArr] = mdName.split('.');
    const title = titleArr.join('.');
    const report = {
        language, time, title,
        html: require('marked').parse(content)
    };
    res.render('port', { reports: [report], t: req.t });
});

/*
if (process.env.VERCEL_ENV !== 'production') {
    app.listen(3000, () => {
        console.log('本地開發伺服器已啟動 http://localhost:3000');
    });
}*/


module.exports = app;
module.exports.handler = serverless(app);