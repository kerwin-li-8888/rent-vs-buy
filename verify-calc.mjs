// 自检脚本：node verify-calc.mjs
// 用与本仓库 HTML 计算器相同的算法，独立复算《租买资产比较计算方法.md》第四节匿名示例，
// 核对页面默认参数应显示的关键数字。若修改了 HTML 的计算逻辑或默认值，请同步更新本脚本。
function loan(principalWan, annualPct, years) {
  const principal = principalWan * 10000;
  const rate = annualPct / 100 / 12;
  const months = years * 12;
  const payment = principal === 0 ? 0 : rate === 0 ? principal / months : principal * rate / (1 - Math.pow(1 + rate, -months));
  return { balance: principal, rate, payment, months, interest: 0 };
}

function calculate(data) {
  const months = data.years * 12;
  const monthlyReturn = Math.pow(1 + data.cashReturn / 100, 1 / 12) - 1;
  const loans = [loan(data.pfLoan, data.pfRate, data.pfYears), loan(data.cmLoan, data.cmRate, data.cmYears)];
  const initialPurchaseCash = (data.buyPrice - data.pfLoan - data.cmLoan + data.buyFees + data.buyFurniture + data.buyRenovation) * 10000;
  const initialRenterCash = (data.rentFurniture + data.renterSetup + data.rentDeposit) * 10000;
  const ownerMonthly = data.buyArea * data.buyPropertyRate + data.ownerExtra;
  const renterMonthly = data.rentArea * data.rentPropertyRate + data.renterExtra;
  let buyerCash = -initialPurchaseCash;
  let renterCash = -initialRenterCash;
  let rentFactor = 0;
  let firstPayment = 0;
  for (let t = 1; t <= months; t++) {
    let mortgage = 0;
    for (const item of loans) {
      if (t > item.months || item.balance <= 1e-7) continue;
      const interest = item.balance * item.rate;
      const actual = Math.min(item.payment, item.balance + interest);
      item.balance = Math.max(0, item.balance + interest - actual);
      item.interest += interest;
      mortgage += actual;
    }
    if (t === 1) firstPayment = mortgage;
    const growth = Math.pow(1 + data.rentGrowth / 100, Math.floor((t - 1) / 12));
    buyerCash = buyerCash * (1 + monthlyReturn) - mortgage - ownerMonthly;
    renterCash = renterCash * (1 + monthlyReturn) - data.rent * growth - renterMonthly;
    rentFactor = rentFactor * (1 + monthlyReturn) + growth;
  }
  const balance = loans.reduce((sum, item) => sum + item.balance, 0);
  const interest = loans.reduce((sum, item) => sum + item.interest, 0);
  const renterWealth = renterCash + (data.rentResidual + data.rentRefund) * 10000;
  const sellerFraction = 1 - data.sellerRate / 100;
  const buyerFixed = buyerCash - data.sellerFixed * 10000 - balance + data.buyResidual * 10000;
  const buyerWealth = buyerFixed + data.salePrice * 10000 * sellerFraction;
  const requiredSaleYuan = (renterWealth - buyerFixed) / sellerFraction;
  const renterZeroRentWealth = renterWealth + data.rent * rentFactor;
  const equivalentRent = (renterZeroRentWealth - buyerWealth) / rentFactor;
  return { buyerWealth, renterWealth, advantage: buyerWealth - renterWealth, requiredSaleWan: requiredSaleYuan / 10000, equivalentRent, balance, interest, firstPayment, initialPurchaseCash, initialRenterCash, ownerMonthly, renterMonthly };
}

// 拟设定的 HTML 默认值 = 方法文档第四节匿名示例
const data = {
  buyPrice: 200, years: 10, salePrice: 210, rent: 5400,
  buyArea: 75, buyPropertyRate: 1.8, buyFurniture: 20, buyRenovation: 0,
  rentArea: 75, rentPropertyRate: 2.5, rentFurniture: 5, rentGrowth: 0,
  buyFees: 5, cashReturn: 2, sellerRate: 1, sellerFixed: 0,
  pfLoan: 50, pfRate: 2.6, pfYears: 24, cmLoan: 50, cmRate: 3, cmYears: 24,
  ownerExtra: 365, renterExtra: 0, renterSetup: 0, rentDeposit: 0,
  rentRefund: 0, buyResidual: 0, rentResidual: 0
};

const r = calculate(data);
const w = x => (x / 10000).toFixed(2);
console.log("组合贷月供（文档 4,773.12）: " + r.firstPayment.toFixed(2) + " 元");
console.log("持有期累计利息（文档 23.54 万）: " + w(r.interest) + " 万元");
console.log("期末剩余贷款（文档 66.26 万）: " + w(r.balance) + " 万元");
console.log("买房期初现金流出 P－贷款＋费用＋装修（应为 125 万）: " + w(r.initialPurchaseCash) + " 万元");
console.log("打平所需卖出价（文档 210.48 万）: " + r.requiredSaleWan.toFixed(2) + " 万元");
console.log("按卖价 210 万的资产差（文档约 -0.48 万，租房多）: " + w(r.advantage) + " 万元");
console.log("业主月持有费（文档 500 元）: " + r.ownerMonthly.toFixed(1) + " 元；租客月费（187.5 元）: " + r.renterMonthly.toFixed(1) + " 元");
console.log("按卖价 210 万对应第一年打平月租: " + r.equivalentRent.toFixed(2) + " 元");
