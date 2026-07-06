import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// xterm mocks
globalThis.FitAddon = { FitAddon: class { fit() {} } };
globalThis.Terminal = class Terminal {
  constructor() {}
  loadAddon() {}
  open() {}
  write() {}
  writeln() {}
  clear() {}
  focus() {}
  onKey() {}
  onResize() {}
  dispose() {}
};

// DOM
globalThis.document.body.innerHTML = '<div id="app"></div>';

// Load fixtures
const networkTopology = JSON.parse(fs.readFileSync(path.join(root, 'data', 'network_topology.json'), 'utf8'));
const virusConfig = JSON.parse(fs.readFileSync(path.join(root, 'data', 'virus_config.json'), 'utf8'));
const storyEvents = JSON.parse(fs.readFileSync(path.join(root, 'data', 'story_events.json'), 'utf8'));

export { networkTopology, virusConfig, storyEvents };

// Class imports
import('../js/filesystem/VirtualFS.js').catch(() => {});
import('../js/filesystem/FileTypes.js').catch(() => {});

export function loadSource() {
  const files = {
    VirtualFS: fs.readFileSync(path.join(root, 'js/filesystem/VirtualFS.js'), 'utf8'),
    FileTypes: fs.readFileSync(path.join(root, 'js/filesystem/FileTypes.js'), 'utf8'),
    NetworkGraph: fs.readFileSync(path.join(root, 'js/network/NetworkGraph.js'), 'utf8'),
    Bloomd: fs.readFileSync(path.join(root, 'js/virus/Bloomd.js'), 'utf8'),
    Watchdog: fs.readFileSync(path.join(root, 'js/virus/Watchdog.js'), 'utf8'),
    USATManager: fs.readFileSync(path.join(root, 'js/story/USATManager.js'), 'utf8'),
    EmailClient: fs.readFileSync(path.join(root, 'js/story/EmailClient.js'), 'utf8'),
    StoryEngine: fs.readFileSync(path.join(root, 'js/story/StoryEngine.js'), 'utf8'),
    MirrorRouter: fs.readFileSync(path.join(root, 'js/network/MirrorRouter.js'), 'utf8'),
    PuzzleStages: fs.readFileSync(path.join(root, 'js/puzzles/PuzzleStages.js'), 'utf8'),
    CommandParser: fs.readFileSync(path.join(root, 'js/terminal/CommandParser.js'), 'utf8'),
    AuthManager: fs.readFileSync(path.join(root, 'js/auth/AuthManager.js'), 'utf8'),
    Utils: fs.readFileSync(path.join(root, 'js/utils.js'), 'utf8'),
  };
  return files;
}

export function createInstances() {
  const src = loadSource();

  function makeClass(code) {
    return new Function('exports', code + '; return eval(Object.keys(exports).filter(k => k !== "__esModule")[0] || Object.keys(exports)[0]);')({});
  }

  // Eval each class in order
  const Utils = (new Function(src.Utils + '; return Utils;'))();
  globalThis.Utils = Utils;
  const VirtualFS = (new Function(src.VirtualFS + '; return VirtualFS;'))();
  const FileTypes = (new Function(src.FileTypes + '; return FileTypes;'))();
  const NetworkGraph = (new Function(src.NetworkGraph + '; return NetworkGraph;'))();
  const Bloomd = (new Function(src.Bloomd + '; return Bloomd;'))();
  const Watchdog = (new Function(src.Watchdog + '; return Watchdog;'))();
  const USATManager = (new Function(src.USATManager + '; return USATManager;'))();
  const EmailClient = (new Function(src.EmailClient + '; return EmailClient;'))();
  const StoryEngine = (new Function(src.StoryEngine + '; return StoryEngine;'))();
  const MirrorRouter = (new Function(src.MirrorRouter + '; return MirrorRouter;'))();
  const PuzzleStages = (new Function(src.PuzzleStages + '; return PuzzleStages;'))();
  const AuthManager = (new Function(src.AuthManager + '; return AuthManager;'))();

  const network = new NetworkGraph(networkTopology);
  const filesystems = {};
  for (const [name, node] of Object.entries(network.nodes)) {
    if (node.isMirror) continue;
    const fsData = FileTypes.getStandardFS(name, node);
    filesystems[name] = VirtualFS.fromJSON(fsData);
  }

  const getFS = (nodeName) => filesystems[nodeName] || null;

  const virus = new Bloomd(network, virusConfig, getFS);
  const watchdog = new Watchdog(network, virusConfig, virus);
  const usat = new USATManager(virusConfig);
  const email = new EmailClient(storyEvents);
  const mirror = new MirrorRouter(network, virusConfig);
  const story = new StoryEngine(storyEvents, network, virus, usat, email, mirror, watchdog);
  const auth = new AuthManager();

  const game = {
    network,
    filesystems,
    virus,
    watchdog,
    usat,
    email,
    mirror,
    story,
    auth,
    tabManager: null,
    puzzles: null,
    addSystemMessage: () => {},
    _updateStatusBar: () => {},
    _autoSave: () => {},
    disconnectFromNode: () => {},
  };

  const puzzles = new PuzzleStages(story, virus, network, mirror, email, filesystems);
  game.puzzles = puzzles;

  return { game, network, virus, watchdog, usat, email, story, mirror, puzzles, auth, VirtualFS, FileTypes, NetworkGraph, Bloomd, Watchdog, USATManager, EmailClient, StoryEngine, MirrorRouter, PuzzleStages, AuthManager, Utils };
}
