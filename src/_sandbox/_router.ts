import { Hono } from 'hono';
import { test01 } from './tests/01_hello';
import { test02 } from './tests/02_db_check';
import { test03 } from './tests/03_db_viewer'; // 1. インポート

export const sandboxRouter = new Hono();

sandboxRouter.route('/test01', test01);
sandboxRouter.route('/test02', test02);
sandboxRouter.route('/test03', test03); // 2. 登録

sandboxRouter.get('/', (c) => c.text("Sandbox Router is active."));