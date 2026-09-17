const button=document.querySelector('.menu');const nav=document.querySelector('#navigation');button.addEventListener('click',()=>{const open=button.getAttribute('aria-expanded')==='true';button.setAttribute('aria-expanded',String(!open));nav.classList.toggle('open',!open)});nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{button.setAttribute('aria-expanded','false');nav.classList.remove('open')}));document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('open')){button.setAttribute('aria-expanded','false');nav.classList.remove('open');button.focus()}});

// Manual apartment slideshows: buttons and arrow keys, without autoplay.
document.querySelectorAll('[data-gallery]').forEach(gallery=>{
  const slides=Array.from(gallery.querySelectorAll('.gallery-stage img'));
  const counter=gallery.querySelector('.gallery-counter');
  let index=0;
  function show(next){
    index=(next+slides.length)%slides.length;
    slides.forEach((slide,i)=>{slide.hidden=i!==index});
    counter.textContent=`${index+1} / ${slides.length}`;
  }
  gallery.querySelector('[data-prev]').addEventListener('click',()=>show(index-1));
  gallery.querySelector('[data-next]').addEventListener('click',()=>show(index+1));
  gallery.addEventListener('keydown',event=>{
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
      event.preventDefault();show(index+(event.key==='ArrowRight'?1:-1));
    }
  });
});
