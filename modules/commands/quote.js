/**
 * This file is part of Stevelabs.
 *
 * @copyright (c) 2020, Steve Guidetti, https://github.com/stevotvr
 * @license MIT
 *
 * For full license information, see the LICENSE.txt file included with the source.
 */

'use strict';

/**
 * Provides the quote commands.
 */
export default class QuoteCommand {

  /**
   * Constructor.
   *
   * @param {Commands} commands The main command module
   */
  constructor(commands) {
    this.app = commands.app;

    commands.quote = this.quote;
    commands.addquote = this.addquote;
    commands.editquote = this.editquote;
    commands.deletequote = this.deletequote;
  }

  async quote(user, args = []) {
    const cb = (err, row) => {
      if (err) {
        console.warn('error getting quote data');
        console.log(err);

        return;
      }

      if (row) {
        const date = new Date(row.date);
        const dateString = `${date.getMonth()}/${date.getDate()}/${date.getFullYear()}`;
        const endTag = row.game ? `[${row.game}] [${dateString}]` : `[${dateString}]`;

        const message = row.message[0] === '"' ? row.message : `"${row.message}"`;
        this.app.chatbot.say(`Quote #${row.id}: ${message} ${endTag}`);
      } else if (user) {
        this.app.chatbot.say(`Sorry, ${user.displayName}, we're all out of quotes!`);
      }
    };

    if (args[0] && args[0].match(/\d+/)) {
      this.app.db.get('SELECT id, date, game, message FROM quotes WHERE id = ?', args[0], cb);
    } else {
      this.app.db.get('SELECT id, date, game, message FROM quotes ORDER BY RANDOM() LIMIT 1', cb);
    }
  }

  async addquote(user, args = []) {
    const message = args.join(' ').trim();

    if (!this.app.islive) {
      this.app.chatbot.say(`@${user.displayName} You can only add a quote when the channel is live`);
    } else if (message.length < 2) {
      this.app.chatbot.say(`@${user.displayName} Your quote message is too short (2 characters min, yours was ${message.length})`);
    } else {
      const game = this.app.api.game;
      const chatbot = this.app.chatbot;
      this.app.db.run('INSERT INTO quotes (date, user, game, message) VALUES (?, (SELECT id FROM users WHERE userId = ?), ?, ?)', Date.now(), user.userId, game, message, function (err) {
        if (err) {
          console.warn('error saving quote data');
          console.log(err);

          return;
        }

        chatbot.say(`Quote #${this.lastID} has been added!`);
      });
    }
  }

  async editquote(user, args = []) {
    if (args.length < 2 || !args[0].match(/\d+/)) {
      throw 'invalid arguments';
    }

    const message = args.slice(1).join(' ').trim();
    this.app.db.run('UPDATE quotes SET message = ? WHERE id = ?', message, args[0], (err) => {
      if (err) {
        console.warn('error saving quote data');
        console.log(err);

        return;
      }

      this.app.chatbot.say(`Quote #${args[0]} has been edited!`);
    });
  }

  async deletequote(user, args = []) {
    if (args.length < 1 || !args[0].match(/\d+/)) {
      throw 'invalid arguments';
    }

    this.app.db.run('DELETE FROM quotes WHERE id = ?', args[0], (err) => {
      if (err) {
        console.warn('error deleting quote data');
        console.log(err);

        return;
      }

      this.app.chatbot.say(`Quote #${args[0]} has been deleted!`);
    });
  }
}
