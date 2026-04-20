import app from './app';
import { env } from './config/env';

const PORT = parseInt(env.PORT, 10);

app.listen(PORT, () => {
  console.log(`🚀 Nam-Payanam Backend started on port ${PORT}`);
  console.log(`🌍 Environment: ${env.NODE_ENV}`);
});