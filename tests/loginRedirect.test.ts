import { test, assertEqual } from './harness';
import { loginPath, safeNextPath, withNext } from '../lib/ui/loginRedirect';

test('sign-in page returns to the page you came from', () => {
  assertEqual(loginPath('/'), '/login');
  assertEqual(loginPath('/tools/validate'), '/login?next=%2Ftools%2Fvalidate');
});

test('a link with a query (a judge\'s QR code) keeps its query through the sign-in', () => {
  const link = '/judge?c=abc123&k=XyZ_9';
  assertEqual(loginPath(link), '/login?next=%2Fjudge%3Fc%3Dabc123%26k%3DXyZ_9');
  assertEqual(safeNextPath(link), link);
});

test('next path stays on this site', () => {
  assertEqual(safeNextPath('/tools/validate'), '/tools/validate');
  assertEqual(safeNextPath(null), '/');
  assertEqual(safeNextPath(''), '/');
  assertEqual(safeNextPath('https://evil.example'), '/');
  assertEqual(safeNextPath('//evil.example'), '/');
  assertEqual(safeNextPath('/\\evil.example'), '/');
});

test('next path never loops back to the sign-in pages', () => {
  assertEqual(safeNextPath('/login'), '/');
  assertEqual(safeNextPath('/login?next=/'), '/');
  assertEqual(safeNextPath('/signup'), '/');
  assertEqual(safeNextPath('/signup?next=/tools/validate'), '/');
});

test('switching between sign in and sign up keeps where to go back to', () => {
  assertEqual(withNext('/signup', '/tools/validate'), '/signup?next=%2Ftools%2Fvalidate');
  assertEqual(withNext('/signup', '/'), '/signup');
  assertEqual(withNext('/login', '//evil.example'), '/login');
});
