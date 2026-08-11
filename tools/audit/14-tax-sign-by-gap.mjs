import { ctx, step, stepHolding, f } from './h.mjs';
function atGap(g){const c=ctx();step(c,12);stepHolding(c,36,g);c.nx=g;return c;}
function clone(c){const d=ctx();Object.assign(d.s,JSON.parse(JSON.stringify(c.s)));d.nx=c.nx;return d;}
console.log('=== 1pp TAX CUT: Δoutput by starting gap and horizon ===');
console.log('  startGap    6m      9m     12m     24m');
for (const g of [-4,-3,-2,-1,0,1]) {
  const seed=atGap(g); const a=clone(seed), b=clone(seed);
  b.s.tax_rate -= 1;
  const out=[];
  for(let m=1;m<=24;m++){ stepHolding(a, 1, a.nx); stepHolding(b, 1, b.nx); if([6,9,12,24].includes(m)) out.push(f(b.s.output-a.s.output,4).padStart(8)); }
  console.log('  '+f(seed.s.output_gap,2).padStart(8)+out.join(''));
}
