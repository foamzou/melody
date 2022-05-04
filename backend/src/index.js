const path = require('path');
const logger = require('consola');
const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 5566;

const middlewareHandleError = require('./middleware/handle_error');
const middlewareAuth = require('./middleware/auth');

require('./init_app')().then(() => {
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