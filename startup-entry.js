// Install recovery before importing the scene graph, so a failed module download
// also has a usable retry action instead of leaving the entry button disabled.
import {installStartupRecovery,reportStartupError} from './startup-support.js';
installStartupRecovery();
try{await import('./main.js');}catch(error){reportStartupError(error);}
