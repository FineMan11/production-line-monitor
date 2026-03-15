// ============================================================
// CLOCK
// ============================================================
function updateClock() {
    var el = document.getElementById('clock');
    if (!el) return;
    var now = new Date();
    var h = String(now.getHours()).padStart(2, '0');
    var m = String(now.getMinutes()).padStart(2, '0');
    var s = String(now.getSeconds()).padStart(2, '0');
    el.textContent = h + ':' + m + ':' + s;
}
setInterval(updateClock, 1000);
updateClock();

// ============================================================
// LIVE TIMERS — tick up the "running time" on each card
// ============================================================
function updateTimers() {
    var now = Date.now();
    // Offset between server time and client load time
    var serverOffset = (window.SERVER_NOW || now) - (window.CLIENT_LOAD || now);

    document.querySelectorAll('[data-since]').forEach(function(el) {
        var since = el.getAttribute('data-since');
        if (!since) { el.textContent = '--'; return; }

        // Parse ISO date from server (no timezone = UTC)
        var sinceMs = new Date(since + (since.endsWith('Z') ? '' : 'Z')).getTime();
        var elapsedMs = (now + serverOffset) - sinceMs;
        if (elapsedMs < 0) elapsedMs = 0;

        var totalSeconds = Math.floor(elapsedMs / 1000);
        var hours = Math.floor(totalSeconds / 3600);
        var minutes = Math.floor((totalSeconds % 3600) / 60);
        // var seconds = totalSeconds % 60; // uncomment to show seconds

        if (hours > 0) {
            el.textContent = hours + 'h ' + minutes + 'm';
        } else {
            el.textContent = minutes + 'm';
        }
    });
}
setInterval(updateTimers, 10000); // update every 10s
updateTimers();

// ============================================================
// STATUS UPDATE MODAL
// ============================================================
function openModal(testerId, testerName) {
    document.getElementById('modal-station-name').textContent = testerName;
    document.getElementById('status-form').action = '/station/' + testerId + '/update_status';

    var historyLink = document.getElementById('modal-history-link');
    if (historyLink) historyLink.href = '/station/' + testerId;

    // Restore saved operator name if any
    var savedName = localStorage.getItem('operatorName') || '';
    var nameInput = document.getElementById('operator-name-input');
    if (nameInput && savedName) nameInput.value = savedName;

    document.getElementById('status-modal').classList.remove('hidden');
    document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('status-modal').classList.add('hidden');
    document.getElementById('modal-overlay').classList.add('hidden');
}

// Save operator name for convenience
document.addEventListener('DOMContentLoaded', function() {
    var nameInput = document.getElementById('operator-name-input');
    if (nameInput) {
        nameInput.addEventListener('change', function() {
            if (this.value.trim()) {
                localStorage.setItem('operatorName', this.value.trim());
            }
        });
    }

    // Close modal on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeModal();
    });
});

// ============================================================
// AUTO REFRESH PAGE EVERY 60 SECONDS (dashboard only)
// ============================================================
if (window.location.pathname === '/') {
    setTimeout(function() {
        window.location.reload();
    }, 60000);
}
