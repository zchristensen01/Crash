/**
 * GAME OVER — the win and lose screen.
 *
 * Losing needs to land as a conclusion, not as a line of grey text in a
 * sidebar. Every ending carries a lesson, and the lesson is the entire
 * reason the game exists — so it gets the whole screen and stops the clock.
 */
import { MONTHS_PER_YEAR } from '../../units.js';
export function mountGameOver(dialog, props) {
  dialog.className = 'over';
  dialog.innerHTML = `
    <p class="over-kicker"></p>
    <h2 class="over-title"></h2>
    <p class="over-lesson"></p>
    <table class="over-score"><tbody></tbody></table>
    <div class="over-actions">
      <button class="over-retry" type="button">Try again, same world</button>
      <button class="over-new" type="button">New world</button>
    </div>
    <p class="over-hint"></p>`;

  dialog.querySelector('.over-retry').addEventListener('click', () => { dialog.close(); props.onRetry(true); });
  dialog.querySelector('.over-new').addEventListener('click', () => { dialog.close(); props.onRetry(false); });

  const kicker = dialog.querySelector('.over-kicker');
  const title = dialog.querySelector('.over-title');
  const lesson = dialog.querySelector('.over-lesson');
  const score = dialog.querySelector('.over-score tbody');
  const hint = dialog.querySelector('.over-hint');

  return {
    open(session) {
      const lost = session.over.kind === 'lost';
      dialog.dataset.kind = lost ? 'lost' : 'won';
      kicker.textContent = lost
        ? `Year ${Math.floor(session.state.tick / MONTHS_PER_YEAR) + 1}, month ${session.state.tick}`
        : 'Eight years. No collapse.';
      title.textContent = lost ? session.over.ending.title : 'YOU SURVIVED';
      lesson.textContent = lost ? session.over.ending.lesson
        : 'Holding it steady is the whole job, and almost nobody manages it ' +
          'first time. Your score is below.';

      score.innerHTML = '';
      const sc = session.scored;
      if (sc) {
        for (const [k, v] of Object.entries(sc.breakdown)) {
          const tr = document.createElement('tr');
          tr.innerHTML = '<td></td><td class="over-num"></td>';
          tr.children[0].textContent = k;
          tr.children[1].textContent = `${v >= 0 ? '+' : ''}${v}`;
          tr.children[1].dataset.sign = v >= 0 ? 'pos' : 'neg';
          score.appendChild(tr);
        }
        const total = document.createElement('tr');
        total.className = 'over-total';
        total.innerHTML = '<td>SCORE</td><td class="over-num"></td>';
        total.children[1].textContent = String(sc.total);
        score.appendChild(total);
      }

      // Same seed means an identical run of luck, so the only thing that
      // changes is what you did. That is how anyone learns from a failed run.
      hint.textContent = 'Trying again on the same world keeps every shock ' +
        'identical and draws this run as a faint ghost behind the next one — ' +
        'so the only difference is your policy.';
      dialog.showModal();
    },
    close() { if (dialog.open) dialog.close(); },
  };
}
