const React = require("react");
const { Text } = require("react-native");

const createIconSet = () => {
  const Icon = ({ name, size, color, ...props }) =>
    React.createElement(Text, { ...props }, name);
  return Icon;
};

const Ionicons = createIconSet();
const MaterialIcons = createIconSet();
const FontAwesome = createIconSet();
const FontAwesome5 = createIconSet();
const AntDesign = createIconSet();
const Entypo = createIconSet();
const EvilIcons = createIconSet();
const Feather = createIconSet();
const Foundation = createIconSet();
const MaterialCommunityIcons = createIconSet();
const Octicons = createIconSet();
const SimpleLineIcons = createIconSet();
const Zocial = createIconSet();

module.exports = {
  Ionicons,
  MaterialIcons,
  FontAwesome,
  FontAwesome5,
  AntDesign,
  Entypo,
  EvilIcons,
  Feather,
  Foundation,
  MaterialCommunityIcons,
  Octicons,
  SimpleLineIcons,
  Zocial,
  createIconSet,
};
