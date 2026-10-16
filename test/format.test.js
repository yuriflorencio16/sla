// JavaScript / test/format.test.js / Node.js 24+ / virtual BRL amounts
import test from 'node:test';
import assert from 'node:assert/strict';
import { money, ledgerLabel } from '../public/format.js';
const plain = text => text.replaceAll('\u00a0', ' ');
test('balances, entries, hit rewards and losses display in centavos', () => {
  assert.equal(plain(money(1000)), 'R$ 10,00');
  assert.equal(plain(money(100)), 'R$ 1,00');
  assert.equal(plain(money(6, true)), '+R$ 0,06');
  assert.equal(plain(money(-4, true)), '-R$ 0,04');
  assert.equal(plain(money(0, true)), 'R$ 0,00');
  assert.equal(plain(money(440)), 'R$ 4,40');
});
test('existing wallet records remain readable in Portuguese without a migration', () => {
  assert.equal(ledgerLabel('Welcome demo credits'), 'Saldo inicial de demonstração');
  assert.equal(ledgerLabel('Round settled · 6/30 hits'), 'Resultado da partida · 6/30 acertos');
  assert.equal(ledgerLabel('Round entry · refundable stake'), 'Entrada na partida');
  assert.equal(ledgerLabel('Free demo refill'), 'Recarga virtual gratuita');
});
