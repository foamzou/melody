// NeteaseCloudMusicApi 有不兼容的代码。晚点提 PR 改下，这里先 hack
String.prototype.replaceAll = function (f, r) {
  return this.replace(new RegExp(f, 'g'), r);
};

const path = require('path');
const logger = require('consola');
const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 5566;


require('./init_app')().then(() => {
  const middlewareHandleError = require('./middleware/handle_error');
  const middlewareAuth = require('./middleware/auth');

  app.use('/api', middlewareAuth);

  app.use(bodyParser.json());
  app.use(cors({
    origin: true,
    credentials: true,
  }));
  app.use('/', require('./router')); 
  app.use(middlewareHandleError);
  
  app.use(express.static(path.resolve(__dirname, '../public')));
  
  const server = app.listen(port, () => {
    const host = server.address().address
    const port = server.address().port
    logger.info(`Express server is listening on ${host}:${port}!`)
  })
});