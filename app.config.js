const { withEntitlementsPlist } = require("expo/config-plugins");
const base = require("./app.json").expo;
function localNotificationsOnly(config) {
  return withEntitlementsPlist(config, (result) => {
    delete result.modResults["aps-environment"];
    return result;
  });
}
module.exports = {
  ...base,
  ios: {
    ...base.ios,
    infoPlist: { ...base.ios.infoPlist, UIBackgroundModes: [] },
    entitlements: {
      "com.apple.security.application-groups": ["group.vn.giadinhanam.family"],
    },
  },
  // Register the removal mod before notifications so it wraps the generated entitlement.
  plugins: [localNotificationsOnly, ...base.plugins, "@bacons/apple-targets"],
};
