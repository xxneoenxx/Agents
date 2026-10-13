import {Config} from '@remotion/cli/config';

// Der Proxy blockt Remotions Chrome-Download; die vorinstallierte Headless-Shell tut es auch.
Config.setBrowserExecutable('/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell');
Config.setVideoImageFormat('png');
Config.setCodec('h264');
Config.setCrf(16);
Config.setPixelFormat('yuv420p');
Config.setX264Preset('slow');
Config.setAudioCodec('aac');
// Jede Szene bekommt eine Tonspur, damit sich die MP4s sauber aneinanderhängen lassen.
Config.setEnforceAudioTrack(true);
Config.setConcurrency(Number(process.env.FLICK_CONCURRENCY || 4));
Config.setChromiumOpenGlRenderer('swangle');
