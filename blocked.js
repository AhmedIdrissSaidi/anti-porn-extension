async function loadLastBlocked() {
  try {
    const { lastBlocked } = await chrome.storage.local.get({ lastBlocked: null });

    const urlEl = document.getElementById('url');
    const timeEl = document.getElementById('time');

    if (!lastBlocked) {
      urlEl.textContent = '(Unavailable)';
      timeEl.textContent = '-';
      return;
    }

    urlEl.textContent = lastBlocked.url || '(Unavailable)';
    timeEl.textContent = new Date(lastBlocked.time || Date.now()).toLocaleString();
  } catch (e) {
    console.error(e);
  }
}

function goSafe() {
  chrome.tabs.query({active:true,currentWindow:true}, tabs => {
    const id = tabs?.[0]?.id;
    if (!id) return location.href='about:blank';

    chrome.tabs.update(id,{url:'chrome://newtab/'},()=>{
      if (chrome.runtime.lastError){
        chrome.tabs.update(id,{url:'about:blank'});
      }
    });
  });
}

document.getElementById('backBtn')?.addEventListener('click',()=>{

  if (history.length > 1){
    history.back();
    setTimeout(()=>{
      if (location.href.includes('blocked')) goSafe();
    },250);
  } else {
    goSafe();
  }

});

document.addEventListener('DOMContentLoaded', loadLastBlocked);
