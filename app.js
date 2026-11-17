import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const $ = (id) => document.getElementById(id);
const configured = SUPABASE_URL.startsWith('https://') && !SUPABASE_URL.includes('YOUR_PROJECT') && SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes('YOUR_PUBLISHABLE');
const supabase = configured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
let currentUser = null;
let allListings = [];

$('year').textContent = new Date().getFullYear();
function message(text, warning=false){ $('status').textContent=text; $('status').classList.toggle('warning',warning); }
function money(value){ const n=Number(value); return Number.isFinite(n) ? `₦${n.toLocaleString('en-NG')}` : 'Farashi bai bayyana ba'; }
function renderListings(items){
  const root=$('listings'); root.innerHTML='';
  if(!items.length){ root.innerHTML='<div class="panel"><strong>Ba a samu kaya ba tukuna.</strong><p>Da zarar an saka listings a database, za su bayyana a nan.</p></div>'; return; }
  for(const item of items){
    const card=document.createElement('article'); card.className='listing-card';
    const title=item.title || item.name || 'Listing';
    const description=item.description || 'Babu cikakken bayani tukuna.';
    const type=item.type || item.listing_type || 'Kaya / Sabis';
    const price=item.price;
    card.innerHTML=`<span class="listing-type"></span><h3></h3><p></p><div class="price"></div>`;
    card.querySelector('.listing-type').textContent=String(type).toUpperCase();
    card.querySelector('h3').textContent=title;
    card.querySelector('p').textContent=description;
    card.querySelector('.price').textContent=price==null?'A tuntubi mai sayarwa':money(price);
    root.appendChild(card);
  }
}
async function loadListings(){
  if(!supabase){ message('An shirya fayilolin. Sai an saka Project URL da Publishable key a config.js kafin haɗin Supabase ya fara.',true); return; }
  message('Ana ɗauko listings daga Supabase…');
  const {data,error}=await supabase.from('listings').select('*').limit(30);
  if(error){ message(`Ba a iya ɗauko listings ba: ${error.message}. Duba RLS policies da sunan table.`,true); return; }
  allListings=data||[]; renderListings(allListings); message(`${allListings.length} listing(s) aka samu.`);
}
function showView(name){
  for(const view of ['home','seller','admin']) $(view+'-view').classList.toggle('hidden',view!==name);
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
}
document.querySelectorAll('.nav-btn').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
$('browse-btn').addEventListener('click',()=>$('listings-section').scrollIntoView({behavior:'smooth'}));
$('seller-cta').addEventListener('click',()=>showView('seller'));
$('search').addEventListener('input',e=>{const q=e.target.value.toLowerCase();renderListings(allListings.filter(x=>[x.title,x.name,x.description,x.type,x.listing_type].filter(Boolean).join(' ').toLowerCase().includes(q)));});
$('auth-open').addEventListener('click',()=>{ $('auth-message').textContent=''; $('auth-dialog').showModal(); });
$('login-btn').addEventListener('click',async()=>{
  if(!supabase){$('auth-message').textContent='Da farko a cika config.js da Project URL da Publishable key.';return;}
  const email=$('email').value.trim(),password=$('password').value;
  const {error}=await supabase.auth.signInWithPassword({email,password});
  $('auth-message').textContent=error?error.message:'An shiga lafiya.';
});
$('signup-btn').addEventListener('click',async()=>{
  if(!supabase){$('auth-message').textContent='Da farko a cika config.js da Project URL da Publishable key.';return;}
  const email=$('email').value.trim(),password=$('password').value;
  const {error}=await supabase.auth.signUp({email,password});
  $('auth-message').textContent=error?error.message:'An aika buƙatar ƙirƙirar account. Duba email idan an nemi tabbatarwa.';
});
$('logout').addEventListener('click',async()=>{if(supabase) await supabase.auth.signOut();});
async function refreshSession(){
  if(!supabase){$('user-label').textContent='Ba a haɗa database ba';return;}
  const {data}=await supabase.auth.getSession(); currentUser=data.session?.user||null;
  $('user-label').textContent=currentUser?currentUser.email:'Ba a shiga ba';
  $('auth-open').classList.toggle('hidden',!!currentUser); $('logout').classList.toggle('hidden',!currentUser);
}
if(supabase){
  supabase.auth.onAuthStateChange(async()=>{await refreshSession();});
}
await refreshSession();
await loadListings();
