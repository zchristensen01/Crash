/**
 * WHY PANEL — the thing that makes this a teaching tool instead of a toy.
 *
 * Click a number, see the exact terms that produced it, each with its own
 * contribution. The terms are guaranteed to sum to the total: trace.record
 * throws if they don't. So if this ever looks wrong, it is the rendering.
 */
import { P } from '../../params.js';

export function mountWhy(dialog, props) {
  dialog.className = 'why';
  dialog.innerHTML = `
    <header><h2 class="why-title"></h2><button class="why-close" type="button">close</button></header>
    <p class="why-help"></p>
    <table class="why-table"><tbody></tbody></table>
    <p class="why-extra"></p>
    <p class="why-note">These are the actual numbers the model added up. Nothing is hidden.</p>`;
  dialog.querySelector('.why-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });

  const title = dialog.querySelector('.why-title');
  const help = dialog.querySelector('.why-help');
  const body = dialog.querySelector('.why-table tbody');
  const extra = dialog.querySelector('.why-extra');

  return {
    open(indicator, trace) {
      title.textContent = indicator.label;
      help.textContent = indicator.help;
      body.innerHTML = '';
      extra.textContent = '';

      const entry = trace.get(indicator.traceKey);
      if (!entry) {
        body.innerHTML = '<tr><td colspan="2">No breakdown recorded yet — advance a month.</td></tr>';
      } else {
        let running = 0;
        for (const [name, v] of Object.entries(entry.terms)) {
          running += v;
          const tr = document.createElement('tr');
          tr.innerHTML = `<td class="why-term"></td>
                          <td class="why-num"></td>
                          <td class="why-run"></td>`;
          tr.querySelector('.why-term').textContent = name;
          const num = tr.querySelector('.why-num');
          num.textContent = `${v >= 0 ? '+' : ''}${v.toFixed(2)}`;
          num.dataset.sign = v >= 0 ? 'pos' : 'neg';
          // The running total is what makes it a waterfall rather than a list.
          tr.querySelector('.why-run').textContent = running.toFixed(2);
          body.appendChild(tr);
        }
        const total = document.createElement('tr');
        total.className = 'why-total';
        total.innerHTML = `<td>TOTAL</td><td class="why-num"></td><td></td>`;
        total.querySelector('.why-num').textContent = entry.total.toFixed(2);
        body.appendChild(total);

        if (entry.extra?.note) extra.textContent = entry.extra.note;
      }

      // Where the evidence is weak or contested, show the RANGE rather than
      // pretending to a point estimate. That honesty is a feature.
      const param = indicator.param && P[indicator.param];
      if (param && ['weak', 'contested', 'judgement'].includes(param.confidence)) {
        extra.textContent += `  ⚠ ${indicator.param} is ${param.confidence}: ` +
          `plausible range ${param.low}–${param.high} ${param.unit}. ${param.source}`;
      }
      dialog.showModal();
    },
  };
}
