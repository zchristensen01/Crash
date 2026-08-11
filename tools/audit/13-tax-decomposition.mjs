import { ctx, step, stepHolding, f, P } from './h.mjs';
function atGap(g){const c=ctx();step(c,12);stepHolding(c,36,g);c.nx=g;return c;}
function clone(c){const d=ctx();Object.assign(d.s,JSON.parse(JSON.stringify(c.s)));d.nx=c.nx;return d;}
const seed = atGap(0);
console.log('=== 1pp TAX CUT at the calm baseline — component decomposition ===');
const a=clone(seed), b=clone(seed);
b.s.tax_rate -= 1;
console.log('  m   Δoutput   ΔC      ΔI      Δdisposable  Δdeficit  Δdebt   Δcrowding-term');
for(let m=1;m<=36;m++){
  stepHolding(a, 1, a.nx); stepHolding(b, 1, b.nx);
  if([1,3,6,9,12,24,36].includes(m)){
    const cro=P.CROWDING_OUT.value;
    const ct=(s)=>{const slack=Math.min(1,Math.max(0,-s.output_gap/2));return -cro*(s.deficit-s.deficit_ss)*(1-slack);};
    console.log('  '+String(m).padStart(3)+f(b.s.output-a.s.output,4).padStart(9)+
      f(b.s.consumption-a.s.consumption,4).padStart(8)+f(b.s.investment-a.s.investment,4).padStart(8)+
      f(b.s.disposable_income-a.s.disposable_income,4).padStart(13)+
      f(b.s.deficit-a.s.deficit,3).padStart(10)+f(b.s.govt_debt-a.s.govt_debt,2).padStart(8)+
      f(ct(b.s)-ct(a.s),4).padStart(17));
  }
}
console.log('\n  doc 02 DIAL 3 / parameters.py PERSONAL_TAX_RATE_TO_GDP: a personal tax cut');
console.log('  "moves consumption, not investment", ~+0.45% of GDP peaking around 3 quarters.');
