const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const EWELINK_CONFIG = {
    region: 'ar',
    appId: 'YzfeftUVcZ6twZw1OoVKPRFYTrGEg01Q',
    appSecret: '4G91qSoboqYO4Y0XJ0LPPKIsq8nBzKkFmjUO5K8BYOo',
    deviceId: '1001db2364',
    email: 'lennonporte15@gmail.com',
    password: 'Lennon25'
};

let accessToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
    if (accessToken && Date.now() < tokenExpiry) {
        return accessToken;
    }

    try {
        const fetch = (await import('node-fetch')).default;
        
        const response = await fetch(`https://${EWELINK_CONFIG.region}-api.coolkit.cc:8080/api/user/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CK-Appid': EWELINK_CONFIG.appId,
                'X-CK-Nonce': Math.random().toString(36).substring(7)
            },
            body: JSON.stringify({
                email: EWELINK_CONFIG.email,
                password: EWELINK_CONFIG.password,
                countryCode: '+54'
            })
        });

        const data = await response.json();
        if (data.error === 0) {
            accessToken = data.at;
            tokenExpiry = Date.now() + 3600000;
            return accessToken;
        }
        throw new Error('Error de autenticación');
    } catch (error) {
        console.error('Error obteniendo token:', error);
        return null;
    }
}

app.post('/control', async (req, res) => {
    const { command } = req.body;

    if (!['on', 'off', 'restart'].includes(command)) {
        return res.status(400).json({ error: 'Comando inválido' });
    }

    try {
        const fetch = (await import('node-fetch')).default;
        const token = await getAccessToken();
        
        if (!token) {
            return res.status(500).json({ error: 'Error de autenticación' });
        }

        let deviceParams = {};
        
        if (command === 'restart') {
            await fetch(`https://${EWELINK_CONFIG.region}-api.coolkit.cc:8080/api/user/device/status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    deviceid: EWELINK_CONFIG.deviceId,
                    params: { switch: 'off' }
                })
            });
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            deviceParams = { switch: 'on' };
        } else {
            deviceParams = { switch: command };
        }

        const response = await fetch(`https://${EWELINK_CONFIG.region}-api.coolkit.cc:8080/api/user/device/status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                deviceid: EWELINK_CONFIG.deviceId,
                params: deviceParams
            })
        });

        const data = await response.json();
        
        if (data.error === 0) {
            console.log(`Comando ejecutado: ${command}`);
            res.json({ success: true, command, message: 'Comando ejecutado' });
        } else {
            res.status(500).json({ error: 'Error del dispositivo' });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

app.get('/status', async (req, res) => {
    try {
        const fetch = (await import('node-fetch')).default;
        const token = await getAccessToken();
        
        if (!token) {
            return res.status(500).json({ error: 'Error de autenticación' });
        }

        const response = await fetch(`https://${EWELINK_CONFIG.region}-api.coolkit.cc:8080/api/user/device/${EWELINK_CONFIG.deviceId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        res.json({ state: data.params?.switch || 'unknown' });
    } catch (error) {
        res.status(500).json({ error: 'Error obteniendo estado' });
    }
});

app.get('/', (req, res) => {
    res.json({ status: 'OK', message: 'Servidor eWeLink funcionando' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});
