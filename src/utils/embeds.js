const { EmbedBuilder } = require('discord.js');

module.exports = {
  success: (title, description) => {
    return new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle(title)
      .setDescription(description)
  },

  error: (title, description) => {
    return new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle(title)
      .setDescription(description)
  },

  info: (title, description) => {
    return new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(title)
      .setDescription(description)
  },

  warning: (title, description) => {
    return new EmbedBuilder()
      .setColor('#ffaa00')
      .setTitle(title)
      .setDescription(description)
  }
};
