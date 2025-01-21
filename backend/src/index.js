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
  const proxy = require('./handler/proxy');

  app.use(bodyParser.json());
  app.use(cors({
    origin: true,
    credentials: true,
  }));

  // 先注册代理路由,跳过 auth 验证
  app.get('/api/proxy/audio', proxy.proxyAudio);
  
  // 其他 API 路由需要 auth
  app.use('/api', middlewareAuth);
  app.use('/', require('./router')); 
  app.use(middlewareHandleError);
  
  app.use(express.static(path.resolve(__dirname, '../public')));
  
  const server = app.listen(port, () => {
    const host = server.address().address
    const port = server.address().port
    logger.info(`Express server is listening on ${host}:${port}!`)
  })

  const schedulerService = require('./service/scheduler');
  schedulerService.start();
});
