"use strict";
// Historical visual-only fixtures retain original Orbit tuning. The new gameplay
// is verified separately; do not overwrite old baselines for an intentional buff.
module.exports=function useOriginalOrbit(fighters) {
  for(const fighter of fighters)if(fighter.data.name==="Orbit") {
    fighter.data.punchDamage=13;fighter.data.punchHitstun=.4;
    delete fighter.data.airDashArc;delete fighter.data.directionalLaunch;
  }
};
