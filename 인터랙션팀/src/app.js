import {renderReceipt,printReceipt} from './receipt.js';
import {MIN_SELECTION,MAX_SELECTION,clamp,keywordStudents,initialNodes,addConnection,isConnected,explanation,encodeMonoBmp,connectionPath} from './model.js';
const app=document.querySelector('#app'),dialog=document.querySelector('#detail');
let catalog,screen='landing',selected=[],nodes=[],edges=[],focus=null,mode='move',pending=null,history=[],filtered=[],current=0,timer,noticeTimer,lastActivity=Date.now(),session=0;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const asset=s=>catalog.assets.find(a=>a.id===s.assetId);
const student=id=>catalog.students.find(s=>s.id===id);
const chosen=()=>selected.map(student);
const symbol='<span class="button-symbol" aria-hidden="true"></span>';
function toast(text){document.querySelector('#notice').textContent=text;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>document.querySelector('#notice').textContent='',3500);}
function setScreen(value){screen=value;clearTimeout(timer);app.replaceChildren();window.scrollTo(0,0);}
function reset(){session++;selected=[];nodes=[];edges=[];history=[];focus=null;pending=null;dialog.close();landing();}
for(const event of ['pointerdown','pointermove','keydown','input','wheel'])document.addEventListener(event,()=>lastActivity=Date.now(),{passive:true});
setInterval(()=>{if(screen!=='landing'&&Date.now()-lastActivity>120000){reset();toast('새로운 관람객을 위해 처음 화면으로 돌아왔어요.');}},1000);
function landing(){
  setScreen('landing');
  app.innerHTML=`<section class="landing" aria-label="나의 첫 단추 시작">${[0,1,2].map((_,i)=>`<div class="marquee" aria-hidden="true">${[...catalog.assets.slice(i*12,i*12+12),...catalog.assets.slice(i*12,i*12+12)].map(a=>`<img src="/${a.letter}" alt="">`).join('')}</div>`).join('')}<div class="landing-start"><div class="start-artwork"><button id="start" aria-label="단추를 클릭하여 시작하기"><img src="/src/start-button.svg" alt="" width="50" height="50"></button><img class="start-label" src="/src/start-label.svg" alt="단추를 클릭하여 시작하기. Click the button to begin" width="240" height="81"></div></div></section>`;
  document.querySelector('#start').onclick=()=>{setScreen('intro');app.innerHTML=`<section class="intro intro-reference" aria-label="모든 시작에는, 저마다의 첫 단추가 있습니다. 당신의 마음을 사로잡는 첫 단추는 무엇인가요?"><div class="intro-layout"><img class="intro-scene" src="/src/intro-scene.svg" alt="단추와 시작 안내"><img class="intro-wordmark" src="/img/letter/44-buttonup.svg" alt="BUTTON UP!"></div></section>`;timer=setTimeout(selectScreen,2200);};
}
function selectScreen(){
  setScreen('select');filtered=keywordStudents(catalog.students,catalog.assets);current=0;
  app.innerHTML=`<section class="selection"><div class="select-top"><h1>Every beginning<br>has a first button<br>to fasten</h1><div class="search-field"><input class="search" id="search" type="search" aria-label="단어 또는 학생 이름 검색" placeholder="학생 이름, 또는 키워드로 검색하기"><svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" stroke-width="1.5"/><path d="m15.5 15.5 4.5 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></div></div><div class="carousel" aria-label="학생의 첫 단추 목록"></div><div class="browse-bar"><input id="position" type="range" min="0" value="0" aria-label="학생 탐색"></div><div class="tray"></div></section>`;
  document.querySelector('#search').oninput=e=>{filtered=keywordStudents(catalog.students,catalog.assets,e.target.value);current=0;renderCarousel();};
  document.querySelector('#position').oninput=e=>centerObject(Number(e.target.value));
  renderCarousel();renderTray();
}
function updateCounter(){document.querySelector('#position').value=current;}
function centerObject(index){
  const carousel=document.querySelector('.carousel');
  const objects=carousel.querySelectorAll('.object');
  const target=objects[index];
  if(!target)return;
  current=index;
  objects.forEach((button,i)=>button.classList.toggle('active',i===index));
  const bounds=carousel.getBoundingClientRect(),rect=target.getBoundingClientRect();
  carousel.scrollTo({left:carousel.scrollLeft+rect.left+rect.width/2-bounds.left-bounds.width/2,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  updateCounter();
}
function renderCarousel(){
  const carousel=document.querySelector('.carousel');
  carousel.innerHTML=filtered.length?filtered.map((s,i)=>{const a=asset(s);return `<button class="object ${i===current?'active':''}" data-id="${s.id}" aria-label="${esc(s.name)} · ${esc(a.wordKo)} 상세 보기"><img class="photo" src="/${a.image}" alt="${esc(a.wordKo)}를 상징하는 이미지" loading="lazy"><img class="word" src="/${a.letter}" alt="${esc(a.wordEn)}"><small>${esc(a.wordKo)}</small></button>`;}).join(''):'<p class="empty">검색 결과가 없어요. 다른 이름이나 단어를 입력해 주세요.</p>';
  document.querySelector('#position').max=Math.max(0,filtered.length-1);document.querySelector('#position').disabled=!filtered.length;updateCounter();
  carousel.querySelectorAll('button').forEach((b,i)=>b.onclick=()=>{centerObject(i);showDetail(b.dataset.id);});
  let scrollTimer;
  carousel.onscroll=()=>{clearTimeout(scrollTimer);scrollTimer=setTimeout(()=>{const bounds=carousel.getBoundingClientRect(),center=bounds.left+bounds.width/2;let nearest=0,dist=Infinity;carousel.querySelectorAll('.object').forEach((b,i)=>{const r=b.getBoundingClientRect(),d=Math.abs(r.left+r.width/2-center);if(d<dist){dist=d;nearest=i;}});current=nearest;updateCounter();},100);};
  carousel.scrollLeft=0;
}
function renderTray(){
  const tray=document.querySelector('.tray');
  tray.innerHTML=selected.length?`<div class="selected-words"><strong>내가 선택한 단어</strong>${chosen().map(s=>`<button class="chip" data-remove="${s.id}" aria-label="${esc(s.name)} 선택 취소">${esc(asset(s).wordKo)} <span aria-hidden="true">⊗</span></button>`).join('')}</div>${selected.length>=MIN_SELECTION?'<button class="make-pattern">선택한 단추로 패턴 만들기 <span aria-hidden="true">⊙</span></button>':''}`:'';
  tray.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{selected=selected.filter(id=>id!==b.dataset.remove);renderTray();});
  document.querySelectorAll('.object').forEach(b=>b.classList.toggle('selected',selected.includes(b.dataset.id)));
  const next=tray.querySelector('.make-pattern');
  if(next)next.onclick=()=>{if(selected.length<MIN_SELECTION)return;nodes=initialNodes(selected);edges=[];history=[];focus=null;pending=null;mode='move';editor();};
}
function showDetail(id){
  const s=student(id),a=asset(s),has=selected.includes(id);
  const members=catalog.students.filter(person=>person.assetId===a.id);
  dialog.setAttribute('aria-label',`${a.wordKo} · 연결된 학생 ${members.length}명`);
  dialog.innerHTML=`<button class="close" aria-label="상세 닫기"><img src="/src/close-icon.png" alt="" aria-hidden="true"></button><div class="detail-layout"><img class="detail-photo" src="/${a.image}" alt="${esc(a.wordKo)}"><div class="detail-content"><h2><img class="detail-word" src="/${a.letter}" alt="${esc(a.wordEn)} · ${esc(a.wordKo)}"></h2><div class="detail-names">${members.map(person=>`<span>${esc(person.displayName||person.name)}</span>`).join('')}</div><div class="detail-reasons">${members.map(person=>`<p><strong>${esc(person.name)}</strong> ${esc(person.reason)}</p>`).join('')}</div><button id="choose">${has?'단어 취소하기':'단어 추가하기'} <img class="detail-add-icon" src="/src/circle-arrow.svg" alt="" aria-hidden="true"></button></div></div>`;
  dialog.querySelector('.close').onclick=()=>dialog.close();
  dialog.querySelector('#choose').onclick=()=>{if(has)selected=selected.filter(x=>x!==id);else if(selected.length<MAX_SELECTION)selected.push(id);else{toast(`최대 ${MAX_SELECTION}개까지 선택할 수 있어요.`);return;}dialog.close();renderTray();};
  dialog.showModal();
}
function save(){history.push(structuredClone({nodes,edges}));if(history.length>50)history.shift();}
function editor(){
  setScreen('editor');
  app.innerHTML=`<div class="editor-title"><h1>Connect your beginning.</h1><p>단추를 움직이고, 원하는 순서로 연결해 보세요.<br>연결 모드에서 두 단추를 차례로 누르면 선이 생겨요.</p></div><div class="tools"><button data-mode="move">이동</button><button data-mode="connect">연결</button><button id="larger" aria-label="선택 단추 확대">＋</button><button id="smaller" aria-label="선택 단추 축소">−</button><button id="rotate">회전 ↻</button><button id="undo">되돌리기</button></div><div class="board" aria-label="단추 배치와 연결 편집 영역"></div><div class="editor-footer"><button id="back">← 다시 선택</button><span class="helper" id="editor-help" role="status"></span><button id="finish" class="primary">내 첫 단추 완성하기 ↗</button></div>`;
  document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;pending=null;drawBoard();});
  for(const [id,change] of [['larger',n=>n.scale=clamp(n.scale+.15,.6,1.6)],['smaller',n=>n.scale=clamp(n.scale-.15,.6,1.6)],['rotate',n=>n.rotation=(n.rotation+30)%360]])document.querySelector('#'+id).onclick=()=>{const n=nodes.find(n=>n.id===focus);if(!n)return toast('먼저 조절할 단추를 선택해 주세요.');save();change(n);drawBoard();};
  document.querySelector('#undo').onclick=()=>{const previous=history.pop();if(previous){({nodes,edges}=previous);pending=null;drawBoard();}};
  document.querySelector('#back').onclick=selectScreen;
  document.querySelector('#finish').onclick=async()=>{if(!isConnected(nodes,edges))return toast('모든 단추를 하나로 연결해 주세요.');const token=session;setScreen('loading');app.innerHTML=`<section class="loading" aria-label="나의 첫 단추 생성 중">${symbol.repeat(3)}</section>`;timer=setTimeout(()=>result(token),1000);};
  drawBoard();
}
function drawBoard(){
  const board=document.querySelector('.board');
  board.innerHTML=`<svg viewBox="0 0 1000 560" aria-label="연결선"><defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10" fill="#bbc4ce"/></marker></defs>${edges.map((e,i)=>{const a=nodes.find(n=>n.id===e.from),b=nodes.find(n=>n.id===e.to);return `<path class="edge" data-edge="${i}" d="${connectionPath(a,b)}" marker-mid="url(#arrow)"/>`;}).join('')}</svg>${nodes.map(n=>{const s=student(n.id),a=asset(s);return `<button class="node ${focus===n.id?'active':''}" data-id="${n.id}" style="left:${n.x/10}%;top:${n.y/5.6}%;width:${13*n.scale}%;" aria-label="${esc(s.name)} ${esc(a.wordKo)} 단추" aria-pressed="${focus===n.id}"><img src="/${a.image}" alt="" style="transform:rotate(${n.rotation}deg)"><span class="node-label">${esc(a.wordEn)}<small>${esc(a.wordKo)} · ${esc(s.name)}</small></span></button>`;}).join('')}`;
  document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mode===mode));
  document.querySelector('#undo').disabled=!history.length;
  document.querySelector('#finish').disabled=!isConnected(nodes,edges);
  document.querySelector('#editor-help').textContent=mode==='connect'?(pending?'이어질 단추를 선택해 주세요.':'시작 단추를 선택하세요. 연결선을 누르면 지워져요.'):'단추를 드래그하거나 선택 후 방향키로 이동할 수 있어요.';
  board.querySelectorAll('[data-edge]').forEach(p=>p.onclick=()=>{if(mode==='connect'){save();edges.splice(Number(p.dataset.edge),1);drawBoard();}});
  board.querySelectorAll('.node').forEach(b=>{
    b.onclick=()=>{focus=b.dataset.id;if(mode==='connect'){if(pending){const next=addConnection(edges,pending,focus);if(next!==edges){save();edges=next;}pending=null;}else pending=focus;}drawBoard();board.querySelector(`[data-id="${focus}"]`)?.focus({preventScroll:true});};
    b.onkeydown=e=>{if(mode!=='move'||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();save();const n=nodes.find(n=>n.id===b.dataset.id);n.x=clamp(n.x+(e.key==='ArrowRight'?10:e.key==='ArrowLeft'?-10:0),120,880);n.y=clamp(n.y+(e.key==='ArrowDown'?10:e.key==='ArrowUp'?-10:0),110,420);focus=n.id;drawBoard();board.querySelector(`[data-id="${focus}"]`).focus();};
    b.onpointerdown=e=>{if(mode!=='move')return;const n=nodes.find(n=>n.id===b.dataset.id),rect=board.getBoundingClientRect(),start={x:e.clientX,y:e.clientY,nx:n.x,ny:n.y};let moved=false;focus=n.id;b.setPointerCapture(e.pointerId);
      b.onpointermove=ev=>{if(Math.hypot(ev.clientX-start.x,ev.clientY-start.y)<4&&!moved)return;if(!moved){save();moved=true;}n.x=clamp(start.nx+(ev.clientX-start.x)/rect.width*1000,120,880);n.y=clamp(start.ny+(ev.clientY-start.y)/rect.height*560,110,420);b.style.left=n.x/10+'%';b.style.top=n.y/5.6+'%';board.querySelectorAll('[data-edge]').forEach((p,i)=>{const a=nodes.find(n=>n.id===edges[i].from),z=nodes.find(n=>n.id===edges[i].to);p.setAttribute('d',connectionPath(a,z));});};
      b.onpointerup=b.onpointercancel=()=>{b.onpointermove=null;if(moved){drawBoard();}};
    };
  });
}
function downloadReceipt(blob, name) {
  const url=URL.createObjectURL(blob), link=document.createElement('a');
  link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
async function result(token){
  if(token!==session)return;setScreen('result');
  const people=chosen(), text=explanation(people,catalog.assets);
  const relatedPeople=people.flatMap(person=>catalog.students.filter(s=>s.assetId===person.assetId));
  const composition={people:structuredClone(relatedPeople), assets:catalog.assets, nodes:structuredClone(nodes), edges:structuredClone(edges), explanation:text};
  app.innerHTML=`<section class="result"><article class="receipt" aria-label="나의 첫 단추 영수증"><p class="receipt-loading" role="status">영수증을 만들고 있어요…</p></article><aside class="result-info"><h1>Your beginning,<br>one of a kind.</h1><p>당신의 선택이 하나의 모양이 되었어요.<br>같은 단추에서 시작한 디자이너의 작품을 만나 보세요.</p><button id="png" class="primary" disabled>영수증 이미지 저장 ↓</button><button id="bmp" disabled>흑백 영수증 저장 ↓</button><button id="print" disabled>영수증 인쇄</button><button id="edit">연결 다시 다듬기</button><button id="restart">다시 시작하기 ↗</button><p class="helper">영수증 용지 80mm에 맞춰 인쇄해 주세요.<br>화면의 디자인 그대로 이미지로 저장할 수 있어요.</p></aside></section>`;
  document.querySelector('#restart').onclick=reset;document.querySelector('#edit').onclick=editor;
  try {
    const artwork=await renderReceipt(composition);
    if(token!==session||screen!=='result')return;
    artwork.id='receipt-artwork';artwork.setAttribute('role','img');
    artwork.setAttribute('aria-label',`나의 첫 단추. 선택한 단어: ${people.map(s=>asset(s).wordKo).join(', ')}. 학생: ${people.map(s=>s.name).join(', ')}. ${text} 관련 작품: ${people.flatMap(s=>s.works).join(', ')}`);
    document.querySelector('.receipt').replaceChildren(artwork);
    for(const id of ['png','bmp','print'])document.querySelector('#'+id).disabled=false;
    document.querySelector('#print').onclick=()=>printReceipt(artwork);
    document.querySelector('#png').onclick=()=>artwork.toBlob(blob=>{if(blob)downloadReceipt(blob,'my-first-button.png');else toast('이미지를 저장하지 못했어요.');},'image/png');
    document.querySelector('#bmp').onclick=()=>{
      const mono=document.createElement('canvas');mono.width=512;mono.height=Math.round(artwork.height*512/artwork.width);
      const ctx=mono.getContext('2d');ctx.drawImage(artwork,0,0,mono.width,mono.height);
      const bytes=encodeMonoBmp(ctx.getImageData(0,0,mono.width,mono.height).data,mono.width,mono.height);
      downloadReceipt(new Blob([bytes],{type:'image/bmp'}),'my-first-button.bmp');
    };
  } catch(error) {
    if(token!==session||screen!=='result')return;
    document.querySelector('.receipt').innerHTML='<p class="receipt-loading">영수증을 불러오지 못했어요. 연결 다시 다듬기를 눌러 다시 시도해 주세요.</p>';
    console.error(error);
  }
}
try{const response=await fetch('/data/catalog.json');if(!response.ok)throw new Error('catalog');catalog=await response.json();landing();}catch{app.innerHTML='<p class="loading-text">데이터를 불러오지 못했습니다. 서버 실행 상태를 확인하고 새로고침해 주세요.</p>';}
