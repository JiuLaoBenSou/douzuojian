import { quantize } from './lib/engine.js?v=9b7a539ecbc06bda';
self.onmessage=event=>{try{const {image,width,height,palette,mode,maxColors}=event.data;self.postMessage({grid:quantize(image,width,height,palette,mode,maxColors)});}catch(error){self.postMessage({error:error.message||'图片处理失败，请换一张图片重试。'});}};
