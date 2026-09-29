import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

const windowEcho = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: parseInt(import.meta.env.VITE_REVERB_PORT, 10),
    forceTLS: false,
    encrypted: false,
    enabledTransports: ['ws', 'wss'],
});

windowEcho.connector.pusher.connection.bind('connected', () => {
    console.log("✅ [REVERB WEBSOCKET]: Connected successfully to local server!");
});

windowEcho.connector.pusher.connection.bind('error', (err) => {
    console.error("❌ [REVERB WEBSOCKET ERROR]:", err);
});

export default windowEcho;