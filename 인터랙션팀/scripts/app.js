import {renderReceipt,printReceipt} from './receipt.js';
import {renderReceiptPreview} from './receipt-preview.js';
import {MIN_SELECTION,MAX_SELECTION,clamp,keywordStudents,initialNodes,addConnection,isConnected,explanation,encodeMonoBmp,connectionPath} from './model.js';
const app=document.querySelector('#app'),dialog=document.querySelector('#detail');
let catalog,screen='landing',selected=[],nodes=[],edges=[],focus=null,mode='move',pending=null,history=[],filtered=[],current=0,timer,noticeTimer,lastActivity=Date.now(),session=0;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const asset=s=>catalog.assets.find(a=>a.id===s.assetId);
const student=id=>catalog.students.find(s=>s.id===id);
const chosen=()=>selected.map(student);
const symbol='<span class="button-symbol" aria-hidden="true"></span>';
function toast(text){document.querySelector('#notice').textContent=text;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>document.querySelector('#notice').textContent='',3500);}
function setScreen(value){screen=value;document.body.dataset.screen=value;clearTimeout(timer);app.replaceChildren();window.scrollTo(0,0);}
function reset(){session++;selected=[];nodes=[];edges=[];history=[];focus=null;pending=null;dialog.close();landing();}
for(const event of ['pointerdown','pointermove','keydown','input','wheel'])document.addEventListener(event,()=>lastActivity=Date.now(),{passive:true});
setInterval(()=>{if(screen!=='landing'&&Date.now()-lastActivity>120000){reset();toast('새로운 관람객을 위해 처음 화면으로 돌아왔어요.');}},1000);
function landing(){
  setScreen('landing');
  app.innerHTML=`<section class="landing" aria-label="나의 첫 단추 시작">${[0,1,2].map((_,i)=>`<div class="marquee" aria-hidden="true">${[...catalog.assets.slice(i*12,i*12+12),...catalog.assets.slice(i*12,i*12+12)].map(a=>`<img src="/${a.letter}" alt="">`).join('')}</div>`).join('')}<div class="landing-start"><div class="start-artwork"><button id="start" aria-label="단추를 클릭하여 시작하기"><img src="/img/start-button.svg" alt="" width="50" height="50"></button><img class="start-label" src="/img/start-label.svg" alt="단추를 클릭하여 시작하기. Click the button to begin" width="240" height="81"></div></div></section>`;
  document.querySelector('#start').onclick=()=>{setScreen('intro');app.innerHTML=`<section class="intro intro-reference" aria-label="모든 시작에는, 저마다의 첫 단추가 있습니다. 당신의 마음을 사로잡는 첫 단추는 무엇인가요?"><div class="intro-layout"><img class="intro-scene" src="/img/intro-scene.svg" alt="단추와 시작 안내"><img class="intro-wordmark" src="/img/letter/44-buttonup.svg" alt="BUTTON UP!"><div class="intro-center-button" aria-hidden="true"><img class="intro-center-btn" src="/img/btn.png" alt=""><img class="intro-center-dream" src="/img/photo/03-dream.png" alt=""></div></div></section>`;timer=setTimeout(introToSelect,1900);};
}
function introToSelect(){
  if(screen!=='intro')return;
  const button=document.querySelector('.intro-center-button');
  if(!button){selectScreen();return;}
  button.classList.add('is-transforming');
  timer=setTimeout(()=>selectScreen({fromIntro:true}),500);
}
function selectScreen(options={}){
  setScreen('select');filtered=keywordStudents(catalog.students,catalog.assets);current=Math.max(0,filtered.findIndex(s=>s.assetId==='03-dream'));
  app.innerHTML=`<section class="selection${options.fromIntro?' is-entering':''}"><div class="select-top"><h1>Every beginning<br>has a first button<br>to fasten</h1><div class="search-field"><input class="search" id="search" type="search" aria-label="단어 또는 학생 이름 검색" placeholder="학생 이름, 또는 키워드로 검색하기"><svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" stroke-width="1.5"/><path d="m15.5 15.5 4.5 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></div></div><div class="carousel" aria-label="학생의 첫 단추 목록"></div><div class="browse-bar"><input id="position" type="range" min="0" value="0" aria-label="학생 탐색"></div><div class="tray"></div></section>`;
  document.querySelector('#search').oninput=e=>{filtered=keywordStudents(catalog.students,catalog.assets,e.target.value);current=0;renderCarousel();};
  document.querySelector('#position').oninput=e=>centerObject(Number(e.target.value));
  renderCarousel();renderTray();
  requestAnimationFrame(()=>centerObject(current,'instant'));
  if(options.fromIntro)timer=setTimeout(()=>document.querySelector('.selection')?.classList.remove('is-entering'),1400);
}
function updateCounter(){document.querySelector('#position').value=current;}
function centerObject(index,behavior){
  const carousel=document.querySelector('.carousel');
  const objects=carousel.querySelectorAll('.object');
  const target=objects[index];
  if(!target)return;
  current=index;
  objects.forEach((button,i)=>button.classList.toggle('active',i===index));
  const bounds=carousel.getBoundingClientRect(),rect=target.getBoundingClientRect();
  carousel.scrollTo({left:carousel.scrollLeft+rect.left+rect.width/2-bounds.left-bounds.width/2,behavior:behavior || (matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth')});
  updateCounter();
}
function renderCarousel(){
  const carousel=document.querySelector('.carousel');
  carousel.innerHTML=filtered.length?filtered.map((s,i)=>{const a=asset(s);return `<button class="object ${i===current?'active':''}" data-id="${s.id}" aria-label="${esc(s.name)} · ${esc(a.wordKo)} 상세 보기"><img class="photo" src="/${a.image}" alt="${esc(a.wordKo)}를 상징하는 이미지" loading="lazy"><img class="word" src="/${a.letter}" alt="${esc(a.wordEn)}"><small>${esc(a.wordKo)}</small></button>`;}).join(''):'<p class="empty">검색 결과가 없어요. 다른 이름이나 단어를 입력해 주세요.</p>';
  document.querySelector('#position').max=Math.max(0,filtered.length-1);document.querySelector('#position').disabled=!filtered.length;updateCounter();
  carousel.querySelectorAll('button').forEach((b,i)=>b.onclick=()=>{centerObject(i);showDetail(b.dataset.id);});
  let scrollTimer,gesture=null,suppressClick=false;
  const nearestObject=()=>{
    const bounds=carousel.getBoundingClientRect(),center=bounds.left+bounds.width/2;
    let nearest=0,dist=Infinity;
    carousel.querySelectorAll('.object').forEach((b,i)=>{const r=b.getBoundingClientRect(),d=Math.abs(r.left+r.width/2-center);if(d<dist){dist=d;nearest=i;}});
    return nearest;
  };
  carousel.onpointerdown=e=>{
    if(!e.isPrimary||e.button!==0)return;
    suppressClick=false;clearTimeout(scrollTimer);
    gesture={id:e.pointerId,x:e.clientX,y:e.clientY,left:carousel.scrollLeft,dragged:false};
  };
  carousel.onpointermove=e=>{
    if(!gesture||e.pointerId!==gesture.id)return;
    const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;
    if(!gesture.dragged){
      if(Math.abs(dx)<6||Math.abs(dx)<Math.abs(dy))return;
      gesture.dragged=true;suppressClick=true;
      carousel.classList.add('dragging');carousel.setPointerCapture(e.pointerId);
    }
    e.preventDefault();carousel.scrollLeft=gesture.left-dx;
    document.querySelector('#position').value=nearestObject();
  };
  const finishDrag=e=>{
    if(!gesture||e.pointerId!==gesture.id)return;
    const dragged=gesture.dragged;gesture=null;
    if(carousel.hasPointerCapture(e.pointerId))carousel.releasePointerCapture(e.pointerId);
    carousel.classList.remove('dragging');
    if(dragged)centerObject(nearestObject());
  };
  carousel.onpointerup=finishDrag;carousel.onpointercancel=finishDrag;carousel.onlostpointercapture=finishDrag;
  carousel.onpointerleave=e=>{if(gesture&&!gesture.dragged)gesture=null;};
  carousel.onkeydown=()=>{suppressClick=false;};
  // Capture before a card's click handler can open its detail dialog.
  carousel._cancelDragClick&&carousel.removeEventListener('click',carousel._cancelDragClick,true);
  carousel._cancelDragClick=e=>{if(suppressClick){e.preventDefault();e.stopImmediatePropagation();}};
  carousel.addEventListener('click',carousel._cancelDragClick,true);
  carousel.ondragstart=e=>e.preventDefault();
  carousel.onscroll=()=>{clearTimeout(scrollTimer);if(gesture)return;scrollTimer=setTimeout(()=>{if(!carousel.isConnected)return;const nearest=nearestObject();if(nearest!==current)centerObject(nearest);else updateCounter();},120);};
  carousel.scrollLeft=0;
}
function renderTray(){
  const tray=document.querySelector('.tray');
  tray.innerHTML=selected.length?`<div class="selected-words"><strong>내가 선택한 단어</strong><div class="chips" aria-label="선택한 단어 칩 목록">${chosen().map(s=>`<button class="chip" data-remove="${s.id}" aria-label="${esc(s.name)} 선택 취소">${esc(asset(s).wordKo)} <span aria-hidden="true">⊗</span></button>`).join('')}</div></div>${selected.length>=MIN_SELECTION?'<button class="make-pattern" aria-label="선택한 단추로 패턴 만들기"><img src="/img/pattern-submit.svg" alt="" aria-hidden="true"></button>':''}`:'';
  const chips=tray.querySelector('.chips');
  if(chips){
    chips.addEventListener('wheel',e=>{if(Math.abs(e.deltaY)>Math.abs(e.deltaX)){e.preventDefault();chips.scrollLeft+=e.deltaY;}},{passive:false});
    let drag=null,moved=false;
    chips.onpointerdown=e=>{drag={x:e.clientX,left:chips.scrollLeft};moved=false;chips.setPointerCapture(e.pointerId);};
    chips.onpointermove=e=>{if(!drag)return;const dx=e.clientX-drag.x;if(Math.abs(dx)>4)moved=true;chips.scrollLeft=drag.left-dx;};
    chips.onpointerup=chips.onpointercancel=()=>{drag=null;};
    chips.onclick=e=>{if(moved){e.preventDefault();e.stopPropagation();moved=false;}};
  }
  tray.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{b.style.width=`${b.offsetWidth}px`;b.classList.add('is-removing');setTimeout(()=>{selected=selected.filter(id=>id!==b.dataset.remove);renderTray();},250);});
  document.querySelectorAll('.object').forEach(b=>b.classList.toggle('selected',selected.includes(b.dataset.id)));
  const next=tray.querySelector('.make-pattern');
  if(next)next.onclick=()=>{if(selected.length<MIN_SELECTION)return;nodes=initialNodes(selected);edges=[];history=[];focus=null;pending=null;mode='move';editor();};
}
function showDetail(id){
  const s=student(id),a=asset(s),has=selected.includes(id);
  const members=catalog.students.filter(person=>person.assetId===a.id);
  dialog.setAttribute('aria-label',`${a.wordKo} · 연결한 학생 ${members.length}명`);
  dialog.innerHTML=`<button class="close" aria-label="상세 닫기"><img src="/img/close-icon.png" alt="" aria-hidden="true"></button><div class="detail-layout"><img class="detail-photo" src="/${a.image}" alt="${esc(a.wordKo)}"><div class="detail-content"><h2><img class="detail-word" src="/${a.letter}" alt="${esc(a.wordEn)} · ${esc(a.wordKo)}"></h2><div class="detail-names">${members.map(person=>`<span>${esc(person.displayName||person.name)}</span>`).join('')}</div><div class="detail-reasons">${members.map(person=>`<p><strong>${esc(person.name)}</strong> ${esc(person.reason)}</p>`).join('')}</div><button id="choose">${has?'단어 취소하기':'단어 추가하기'} <img class="detail-add-icon" src="/img/circle-arrow.svg" alt="" aria-hidden="true"></button></div></div>`;
  dialog.querySelector('.close').onclick=()=>dialog.close();
  dialog.querySelector('#choose').onclick=()=>{if(has)selected=selected.filter(x=>x!==id);else if(selected.length<MAX_SELECTION)selected.push(id);else{toast(`최대 ${MAX_SELECTION}개까지 선택할 수 있어요`);return;}dialog.close();renderTray();};
  dialog.showModal();
}function save(){history.push(structuredClone({nodes,edges}));if(history.length>50)history.shift();}
function editor(){
  setScreen('editor');
  app.innerHTML=`<section class="pattern-editor"><div class="board" aria-label="단추 배치와 연결 편집 영역"></div><div class="editor-footer"><div class="editor-actions"><button id="back" aria-label="이전단계로"><img src="/img/previous-step.svg" alt="" aria-hidden="true"></button></div><p class="helper" id="editor-help" role="status">드래그로 물건을 배치하고, <strong>클릭한 순서대로</strong> 선이 이어집니다.<br>물건 위 도구로 크기·회전을 조절할 수 있어요.</p><button id="finish" aria-label="이 패턴으로 생성하기"><img src="/img/generate-pattern.svg" alt="" aria-hidden="true"></button></div></section>`;
  document.querySelector('#back').onclick=selectScreen;
  document.querySelector('#finish').onclick=async()=>{
    if(!isConnected(nodes,edges))return toast('모든 단추를 하나로 연결해 주세요');
    const token=session;setScreen('loading');
    app.innerHTML=`<section class="pattern-loading" role="status" aria-live="polite"><div class="pattern-loading-panel"><div class="pattern-loading-buttons" aria-hidden="true"><img src="/img/btn.png" alt=""><img src="/img/btn2.png" alt=""><img src="/img/btn.png" alt=""></div><p>나만의 패턴을 만들고 있어요.<br>조금만 기다려주세요.</p></div></section>`;
    const finishLoading=()=>{if(token===session&&screen==='loading')timer=setTimeout(()=>result(token),1000);};
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)finishLoading();
    else document.querySelector('.pattern-loading-buttons img:last-child').addEventListener('animationend',finishLoading,{once:true});
  };
  drawBoard();
}
function drawBoard(){
  const board=document.querySelector('.board');
  const active=nodes.find(n=>n.id===focus);
  board.innerHTML=`<svg viewBox="0 0 1000 560" preserveAspectRatio="none" aria-label="연결선">${edges.map((e,i)=>{const a=nodes.find(n=>n.id===e.from),b=nodes.find(n=>n.id===e.to);return `<path class="edge" data-edge="${i}" d="${connectionPath(a,b)}"/>`;}).join('')}</svg>${nodes.map(n=>{const s=student(n.id),a=asset(s);return `<button class="node ${focus===n.id?'active':''}" data-id="${n.id}" style="left:${n.x/10}%;top:${n.y/5.6}%;width:${13*n.scale}%;" aria-label="${esc(s.name)} ${esc(a.wordKo)} 단추" aria-pressed="${focus===n.id}"><img class="node-photo" draggable="false" src="/${a.image}" alt="" style="transform:rotate(${n.rotation}deg)"><span class="node-label"><img class="node-word" draggable="false" src="/${a.letter}" alt="${esc(a.wordEn)}"><small>${esc(a.wordKo)}</small></span></button>`;}).join('')}${active?`<div class="node-tools" role="group" aria-label="선택 단추 크기와 회전" style="left:${active.x/10}%;top:${active.y/5.6}%;--node-radius:${6.5*active.scale}cqw"><button data-adjust="larger" aria-label="선택 단추 확대">+</button><button data-adjust="smaller" aria-label="선택 단추 축소">−</button><button data-adjust="rotate" aria-label="선택 단추 회전"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7a8 8 0 1 1-1 9M5 3v5h5"/></svg></button></div>`:''}`;
  document.querySelector('#finish').disabled=!isConnected(nodes,edges);
  board.onclick=e=>{if(e.target===board||e.target===board.querySelector('svg')){focus=null;pending=null;drawBoard();}};
  board.querySelectorAll('[data-adjust]').forEach(b=>b.onclick=()=>{
    save();
    if(b.dataset.adjust==='larger')active.scale=clamp(active.scale+.15,.6,1.6);
    if(b.dataset.adjust==='smaller')active.scale=clamp(active.scale-.15,.6,1.6);
    if(b.dataset.adjust==='rotate')active.rotation=(active.rotation+30)%360;
    drawBoard();board.querySelector(`[data-adjust="${b.dataset.adjust}"]`).focus({preventScroll:true});
  });
  board.querySelectorAll('[data-edge]').forEach(p=>p.onclick=()=>{save();edges.splice(Number(p.dataset.edge),1);drawBoard();});
  function selectNode(id){
    if(pending&&pending!==id){const next=addConnection(edges,pending,id);if(next!==edges){save();edges=next;}}
    focus=id;pending=id;drawBoard();board.querySelector(`[data-id="${id}"]`)?.focus({preventScroll:true});
  }
  board.querySelectorAll('.node').forEach(b=>{
    let suppressClick=false;
    b.onclick=()=>{if(suppressClick){suppressClick=false;return;}selectNode(b.dataset.id);};
    b.onkeydown=e=>{
      if(e.key==='Escape'){focus=null;pending=null;drawBoard();return;}
      if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
      e.preventDefault();save();const n=nodes.find(n=>n.id===b.dataset.id);
      n.x=clamp(n.x+(e.key==='ArrowRight'?10:e.key==='ArrowLeft'?-10:0),120,880);
      n.y=clamp(n.y+(e.key==='ArrowDown'?10:e.key==='ArrowUp'?-10:0),110,420);
      focus=n.id;pending=n.id;drawBoard();board.querySelector(`[data-id="${focus}"]`).focus({preventScroll:true});
    };
    b.onpointerdown=e=>{
      if(!e.isPrimary||e.button!==0)return;
      const n=nodes.find(n=>n.id===b.dataset.id),rect=board.getBoundingClientRect(),start={x:e.clientX,y:e.clientY,nx:n.x,ny:n.y};
      let moved=false;b.setPointerCapture(e.pointerId);
      b.onpointermove=ev=>{
        if(Math.hypot(ev.clientX-start.x,ev.clientY-start.y)<4&&!moved)return;
        if(!moved){save();moved=true;board.querySelector('.node-tools')?.remove();}
        n.x=clamp(start.nx+(ev.clientX-start.x)/rect.width*1000,120,880);
        n.y=clamp(start.ny+(ev.clientY-start.y)/rect.height*560,110,420);
        b.style.left=n.x/10+'%';b.style.top=n.y/5.6+'%';
        board.querySelectorAll('[data-edge]').forEach((p,i)=>p.setAttribute('d',connectionPath(nodes.find(n=>n.id===edges[i].from),nodes.find(n=>n.id===edges[i].to))));
      };
      b.onpointerup=b.onpointercancel=ev=>{
        b.onpointermove=null;b.onpointerup=null;b.onpointercancel=null;
        if(b.hasPointerCapture(ev.pointerId))b.releasePointerCapture(ev.pointerId);
        if(moved){suppressClick=true;focus=n.id;pending=n.id;requestAnimationFrame(()=>{if(screen==='editor')drawBoard();});}
      };
    };
  });
}function downloadReceipt(blob, name) {
  const url=URL.createObjectURL(blob), link=document.createElement('a');
  link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
async function result(token){
  if(token!==session)return;setScreen('result');
  const people=chosen(), text=explanation(people,catalog.assets);
  const relatedPeople=people.flatMap(person=>catalog.students.filter(s=>s.assetId===person.assetId));
  const composition={people:structuredClone(relatedPeople), assets:catalog.assets, nodes:structuredClone(nodes), edges:structuredClone(edges), explanation:text};
  app.innerHTML=`<section class="result result-final" aria-label="나의 첫 단추 결과"><div class="result-decoration" aria-hidden="true">${[0,1,2,3,4].map(()=>'<img src="/img/btn_mini.png" alt="">').join('')}</div><article class="receipt" aria-label="나의 첫 단추 영수증"><p class="receipt-loading" role="status">영수증을 만들고 있어요…</p></article><aside class="result-qr"><img src="/img/receipt-qr-placeholder.svg" alt="다운로드 준비 중인 임시 QR 코드"><span class="qr-pointer" aria-hidden="true">▲</span><p>QR 코드 다운 받기</p><small>다운로드 준비 중</small></aside><button id="restart" class="result-restart" type="button" aria-label="처음으로"><img src="/img/restart-button.svg" alt=""></button><footer class="result-bottom"><p>사용자님이 연결한 첫단추를 인쇄 중입니다. 60초 뒤에 첫 화면으로 돌아갑니다.</p></footer></section>`;
  document.querySelector('#restart').onclick=reset;
  timer=setTimeout(reset,60000);
  try {
    const artwork=await renderReceipt(composition);
    if(token!==session||screen!=='result')return;
    document.querySelector('.receipt').replaceChildren(renderReceiptPreview(composition));
    // Paint the completed result before opening the print dialog once.
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      if(token!==session||screen!=='result')return;
      lastActivity=Date.now();
      printReceipt(artwork);
    }));
  } catch(error) {
    if(token!==session||screen!=='result')return;
    document.querySelector('.receipt').innerHTML='<p class="receipt-loading">영수증을 불러오지 못했어요. 새로고침 후 다시 시도해 주세요.</p>';
    console.error(error);
  }
}
try{const response=await fetch('/data/catalog.json');if(!response.ok)throw new Error('catalog');catalog=await response.json();landing();}catch{app.innerHTML='<p class="loading-text">데이터를 불러오지 못했습니다. 서버 실행 상태를 확인하고 새로고침해 주세요.</p>';}

