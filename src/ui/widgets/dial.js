/**
 * DIAL widget — a draggable slider. The dials are the game; a slider you drag
 * and watch respond is a different object from a number you type, and that
 * difference is most of the reason to leave the terminal.
 * WHO WRITES THIS: you.
 */

/**
 * @param {HTMLElement} mount @param {Object} props { dial, state, onChange }
 * @returns {{update:Function}}
 *
 * Show the NEUTRAL marker — without it a player cannot tell whether 3% is
 * loose or tight, which is the first thing they need to know.
 *
 * On release, onChange schedules through the lag pipeline. Give immediate
 * visual acknowledgement that the input registered, while making clear the
 * EFFECT has not landed: the number moves now, the consequence is a new row
 * in the pipeline panel. Confusing those two is exactly what the pipeline
 * panel exists to prevent.
 */
export function mountDial(mount, props) {
  throw new Error('dial.mountDial: not implemented');
}
