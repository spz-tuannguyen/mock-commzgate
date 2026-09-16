const app = require('./app');

let PORT = parseInt(process.env.PORT, 10) || 3001;

function startServer(port) {
  const server = app.listen(port, () => {
    console.log('====================================================');
    console.log('       COMMZGATE MOCK SERVER (Cloud & Device)       ');
    console.log('====================================================');
    console.log(` Web UI Dashboard : http://localhost:${port}`);
    console.log(` Health Check     : http://localhost:${port}/health`);
    console.log('');
    console.log(' CommzGate Cloud Endpoints:');
    console.log(`   - GET/POST http://localhost:${port}/gateway/SendMessage`);
    console.log(`   - GET/POST http://localhost:${port}/gateway/SendMessage.aspx`);
    console.log(`   - GET/POST http://localhost:${port}/gateway/SendSMS`);
    console.log('');
    console.log(' CommzGate Device / CG-ONE Endpoints:');
    console.log(`   - GET/POST http://localhost:${port}/api/SendMsg`);
    console.log(`   - GET/POST http://localhost:${port}/gateway/SendMsg`);
    console.log(`   - GET/POST http://localhost:${port}/SendMsg`);
    console.log(`   - GET/POST http://localhost:${port}/api/GetMsgStat`);
    console.log('====================================================');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Port in use] Port ${port} is occupied, trying ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer(PORT);
