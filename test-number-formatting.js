// Test script to verify number formatting with commas
const economy = require('./src/utils/economy');

console.log('Testing number formatting with commas:');
console.log('');

// Test various numbers
const testNumbers = [
  123,
  1234,
  12345,
  123456,
  1234567,
  12345678,
  123456789,
  1234567890,
  12345678901
];

testNumbers.forEach(num => {
  console.log(`${num.toString().padStart(12)} => ${economy.formatNumber(num)}`);
});

console.log('');
console.log('Testing formatMoney (should be same as formatNumber):');
testNumbers.forEach(num => {
  console.log(`${num.toString().padStart(12)} => ${economy.formatMoney(num)}`);
});