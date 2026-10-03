/**
 * Importing each category module registers its renderers into `T` (see
 * registry-core.ts) as a side effect — mirrors the original file's layout,
 * where every `def('key', {...})` call ran top-to-bottom in one <script>.
 */
import './layout-text-buttons.js';
import './inputs-indicators.js';
import './charts.js';
import './maps.js';
import './shapes-emoji.js';
import './data-widgets.js';
import './media.js';
import './nav-frames-pos.js';

export { T, def } from './registry-core.js';
