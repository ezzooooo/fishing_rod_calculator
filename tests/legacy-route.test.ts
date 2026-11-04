import assert from 'node:assert/strict';
import {test} from 'node:test';
import {legacyRouteTarget} from '../src/lib/legacy-route';
test('preserves Flutter hash navigation and converts quote document links',()=>{
  assert.equal(legacyRouteTarget('/','#/brands'),'/brands');
  assert.equal(legacyRouteTarget('/','#/quotes/old-id'),'/quotes/detail?id=old-id');
  assert.equal(legacyRouteTarget('/quotes/old-id/'),'/quotes/detail?id=old-id');
  assert.equal(legacyRouteTarget('/','#/fishing-rods/edit/old-rod'),'/fishing-rods');
});
test('leaves current routes and arbitrary fragments alone',()=>{
  assert.equal(legacyRouteTarget('/quotes/detail/'),null);
  assert.equal(legacyRouteTarget('/','#section'),null);
  assert.equal(legacyRouteTarget('/','#/https://example.com'),null);
  assert.equal(legacyRouteTarget('/quotes/%E0%A4/'),null);
});
