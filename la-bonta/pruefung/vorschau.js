const { chromium } = require('playwright-core');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const FILE='file:///home/user/Agents/la-bonta/LA-BONTA-Vorschau.html';
const OUT=__dirname+'/bilder'; require('fs').mkdirSync(OUT,{recursive:true});
const f=[]; const P=(ok,n,d)=>{console.log(`${ok?'OK  ':'FAIL'}  ${n}${d?'  → '+d:''}`); if(!ok)f.push(n);};

(async()=>{
 const br=await chromium.launch({executablePath:EXE});
 // iPhone hochkant, MIT reduzierter Bewegung (Härtefall)
 const ctx=await br.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,
   isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 const p=await ctx.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
 p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
 await p.goto(FILE,{waitUntil:'load'}); await p.waitForTimeout(1400);

 P(errs.length===0,'Keine JS-Fehler',errs.slice(0,2).join(' | '));

 // Trotz "Bewegung reduzieren" müssen Animationen laufen
 const bew=await p.evaluate(()=>({erzwungen:window.__bewegungErzwingen,reduce:window.__reduce,
   hinweis:!document.getElementById('vor-bewegung').hidden}));
 P(bew.erzwungen===true&&bew.reduce===false,'Bewegung trotz Gerätewunsch aktiv',JSON.stringify(bew));
 P(bew.hinweis,'Hinweis auf Geräteeinstellung sichtbar');

 // Panel
 await p.click('#vor-knopf'); await p.waitForTimeout(400);
 const anz=await p.evaluate(()=>document.querySelectorAll('#vor-liste li').length);
 P(anz>=20,'Funktionsliste gefüllt',`${anz} Einträge`);
 const sorten=await p.evaluate(()=>document.querySelectorAll('#vor-sorten button').length);
 P(sorten===6,'Eissorten-Knöpfe (inkl. Automatisch)',`${sorten}`);
 await p.screenshot({path:OUT+'/panel-neu.png'});

 // Buch hochkant erzwingen
 await p.evaluate(()=>{location.hash='#karte';}); await p.waitForTimeout(2200);
 const b=await p.evaluate(()=>({aktiv:document.querySelector('[data-buch-huelle]').getAttribute('data-aktiv'),
   n:document.querySelectorAll('[data-buch="speisen"] .seite').length,
   stand:document.querySelector('[data-buch="speisen"] [data-buch-stand]').textContent,
   breite:Math.round(document.querySelector('[data-buch="speisen"] .seite').getBoundingClientRect().width)}));
 P(b.aktiv==='true','Buch hochkant sofort da (ohne Knopf)',b.aktiv);
 P(/^Seite \d+ von/.test(b.stand),'Einzelseiten-Modus',b.stand);
 P(b.breite>300,'Seite breit genug lesbar',`${b.breite}px`);
 await p.waitForTimeout(300);
 await p.screenshot({path:OUT+'/buch-hochkant.png'});

 // Doppelte Handler? Nach mehrfachem Neuaufbau darf ein Klick nur EINEN Schritt gehen
 await p.evaluate(()=>{document.getElementById('vor-panel').hidden=true;
   window.__buecherNeu();window.__buecherNeu();});
 await p.waitForTimeout(1600);
 const vorher=await p.evaluate(()=>document.querySelector('[data-buch="speisen"] [data-buch-stand]').textContent);
 await p.evaluate(()=>document.querySelector('[data-buch="speisen"] [data-buch-vor]').click());
 await p.waitForTimeout(1400);
 const nachher=await p.evaluate(()=>document.querySelector('[data-buch="speisen"] [data-buch-stand]').textContent);
 const nz=s=>parseInt(s.match(/\d+/)[0],10);
 P(nz(nachher)-nz(vorher)===1,'Ein Klick = ein Schritt (keine Mehrfach-Handler)',`${vorher} → ${nachher}`);

 // Saison-Band
 await p.click('#vor-knopf'); await p.waitForTimeout(300);
 await p.check('#vor-saison'); await p.waitForTimeout(600);
 const sb=await p.evaluate(()=>{const e=document.querySelector('.vseite[data-seite="start"] [data-saison]');
   return {hidden:e.hidden,sicht:e.offsetHeight>10};});
 P(!sb.hidden&&sb.sicht,'Saison-Band einblendbar',JSON.stringify(sb));

 // Eissorte von Hand
 await p.click('#vor-knopf'); await p.waitForTimeout(300);
 const farben=[];
 for(let i=0;i<3;i++){
   await p.evaluate(i=>document.querySelectorAll('#vor-sorten button')[i+1].click(),i);
   await p.waitForTimeout(700);
   farben.push(await p.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--gelato').trim()));
   await p.click('#vor-knopf'); await p.waitForTimeout(200);
 }
 P(new Set(farben).size===3,'Eissorten schalten Farbe um',farben.join(' '));

 // Alle "Zeigen"-Knöpfe durchklicken
 const n=await p.evaluate(()=>document.querySelectorAll('#vor-liste li button').length);
 let ok=0, kaputt=[];
 for(let i=0;i<n;i++){
   await p.evaluate(()=>{const pn=document.getElementById('vor-panel'); if(pn.hidden)document.getElementById('vor-knopf').click();});
   await p.waitForTimeout(150);
   const label=await p.evaluate(i=>document.querySelectorAll('#vor-liste li b')[i].textContent,i);
   try{
     await p.evaluate(i=>document.querySelectorAll('#vor-liste li button')[i].click(),i);
     await p.waitForTimeout(900);
     const sicht=await p.evaluate(()=>[...document.querySelectorAll('.vseite')].filter(s=>!s.hidden).length);
     if(sicht===1) ok++; else kaputt.push(label+' (Seiten:'+sicht+')');
   }catch(e){ kaputt.push(label+' '+e.message); }
 }
 P(ok===n,`Alle ${n} „Zeigen"-Knöpfe funktionieren`,kaputt.length?kaputt.join('; '):`${ok}/${n}`);
 P(errs.length===0,'Weiterhin keine JS-Fehler',errs.slice(0,3).join(' | '));

 // Dienstag-Abfangen im Formular
 await p.evaluate(()=>{location.hash='#tisch';});
 await p.waitForTimeout(700);
 await p.evaluate(()=>{const pn=document.getElementById('vor-panel'); if(pn.hidden)document.getElementById('vor-knopf').click();});
 await p.waitForTimeout(200);
 await p.evaluate(()=>{const bs=[...document.querySelectorAll('#vor-liste li')];
   const li=bs.find(l=>l.querySelector('b').textContent.includes('Dienstag'));
   li.querySelector('button').click();});
 await p.waitForTimeout(1200);
 const fehl=await p.evaluate(()=>document.getElementById('f-fehler').textContent);
 P(/Ruhetag/.test(fehl),'Formular fängt Dienstag ab',fehl.slice(0,60));

 await p.screenshot({path:OUT+'/formular.png'});
 await ctx.close(); await br.close();
 console.log('\n'+(f.length?`${f.length} Fehler: ${f.join(', ')}`:'Alle Prüfungen bestanden'));
 process.exit(f.length?1:0);
})();
