const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Aplicar StealthPlugin para evitar detección de bots
puppeteer.use(StealthPlugin());

// Lista de user agents realistas
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
];

// Función para obtener un user agent aleatorio
const getRandomUserAgent = () => {
  return userAgents[Math.floor(Math.random() * userAgents.length)];
};

// Función para simular movimientos de ratón humanos
async function simulateHumanMouse(page) {
  const viewport = await page.viewport();
  const maxX = viewport.width;
  const maxY = viewport.height;

  // Simular movimientos aleatorios del ratón
  for (let i = 0; i < 3; i++) {
    const x = Math.floor(Math.random() * maxX);
    const y = Math.floor(Math.random() * maxY);
    await page.mouse.move(x, y, { steps: 10 });
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500)); // Retraso aleatorio
  }

  // Simular un clic aleatorio
  const clickX = Math.floor(Math.random() * maxX);
  const clickY = Math.floor(Math.random() * maxY);
  await page.mouse.click(clickX, clickY);
}

// Función para simular desplazamiento humano
async function simulateHumanScroll(page) {
  await page.evaluate(async () => {
    const scrollHeight = document.body.scrollHeight;
    let currentPosition = 0;
    while (currentPosition < scrollHeight) {
      currentPosition += Math.floor(Math.random() * 300) + 100;
      window.scrollTo(0, currentPosition);
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
    }
  });
}

async function getVideoUrlsAdvanced(pageUrl) {
  // Tamaño de viewport aleatorio para simular diferentes dispositivos
  const viewportWidths = [1280, 1366, 1440, 1920];
  const viewportHeights = [720, 768, 800, 1080];
  const randomWidth = viewportWidths[Math.floor(Math.random() * viewportWidths.length)];
  const randomHeight = viewportHeights[Math.floor(Math.random() * viewportHeights.length)];

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      `--user-agent=${getRandomUserAgent()}`,
    ],
  });

  const page = await browser.newPage();
  await page.setBypassCSP(true);
  await page.setViewport({ width: randomWidth, height: randomHeight });

  const videoUrls = new Set();

  // Interceptar solicitudes
  await page.setRequestInterception(true);

  page.on('request', (request) => {
    request.continue();
  });

  page.on('response', async (response) => {
    const url = response.url();
    const headers = response.headers();

    if (
      url.match(/\.(m3u8|mp4|m3u|ts|hls|f4m|mpd|ism|m4s)/i) ||
      headers['content-type']?.includes('application/vnd.apple.mpegurl') ||
      headers['content-type']?.includes('video/mp4') ||
      headers['content-type']?.includes('application/dash+xml')
    ) {
      videoUrls.add(url);
    }
  });

  // Navegar a la página con comportamiento humano
  await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 60000 });

  // Simular interacciones humanas
  await simulateHumanMouse(page);
  await simulateHumanScroll(page);

  // Retraso aleatorio para simular tiempo de lectura humano
  await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));

  // Buscar en iframes
  const frames = page.frames();
  for (const frame of frames) {
    try {
      const frameVideoElements = await frame.$$eval('video, source', (elements) => {
        return elements.map(el => el.src || el.getAttribute('data-src'));
      });

      frameVideoElements.forEach(url => {
        if (url) videoUrls.add(url);
      });
    } catch (e) {
      console.log('Error al acceder a iframe:', e);
    }
  }

  // Extraer URLs de scripts
  const scriptContents = await page.$$eval('script', (scripts) => {
    return scripts.map(script => script.textContent);
  });

  const urlRegex = /(https?:\/\/[^\s"']+\.(m3u8|mp4|m3u|ts|hls|f4m|mpd|ism|m4s)[^\s"']*)/gi;

  scriptContents.forEach(content => {
    const matches = content.match(urlRegex);
    if (matches) {
      matches.forEach(url => videoUrls.add(url));
    }
  });

  await browser.close();

  return Array.from(videoUrls).filter(url => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  });
}

// Ejemplo de uso
(async () => {
  const videoLinks = await getVideoUrlsAdvanced('https://filemoon.to/e/0yjlwt0my12x');
  console.log('Enlaces de video encontrados:', videoLinks);
})();