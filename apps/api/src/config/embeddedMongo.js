import net from 'net';
import * as BSON from 'bson';
import siftDefault from 'sift';

const sift = siftDefault.default || siftDefault;

export class EmbeddedMongoServer {
  constructor() {
    this.server = null;
    this.collections = new Map();
    this.reqId = 1;
    this.port = 27017;
  }

  getCollection(db, name) {
    const key = `${db}.${name}`;
    if (!this.collections.has(key)) {
      this.collections.set(key, []);
    }
    return this.collections.get(key);
  }

  start(port = 27017) {
    this.port = port;
    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => {
        let buffer = Buffer.alloc(0);

        socket.on('data', (data) => {
          buffer = Buffer.concat([buffer, data]);

          while (buffer.length >= 16) {
            const messageLength = buffer.readInt32LE(0);
            if (buffer.length < messageLength) {
              break;
            }

            const packet = buffer.subarray(0, messageLength);
            buffer = buffer.subarray(messageLength);

            const requestId = packet.readInt32LE(4);
            const opCode = packet.readInt32LE(12);

            if (opCode === 2004) {
              // OP_QUERY (Legacy handshake)
              try {
                let cstrEnd = 20;
                while (cstrEnd < packet.length && packet[cstrEnd] !== 0) cstrEnd++;
                const queryOffset = cstrEnd + 9;
                if (queryOffset < packet.length) {
                  const docSize = packet.readInt32LE(queryOffset);
                  const docBuf = packet.subarray(queryOffset, queryOffset + docSize);
                  const queryDoc = BSON.deserialize(docBuf);
                  const responseDoc = this.handleCommand(queryDoc, new Map());
                  this.sendOpReply(socket, requestId, responseDoc);
                }
              } catch (err) {
                console.error('[EMBEDDED MONGO] OP_QUERY error:', err);
              }
            } else if (opCode === 2013) {
              // OP_MSG
              let offset = 20;
              let mainDoc = null;
              const sectionDocs = new Map();

              while (offset < messageLength) {
                const kind = packet.readUInt8(offset);
                offset += 1;
                if (kind === 0) {
                  const docSize = packet.readInt32LE(offset);
                  const docBuf = packet.subarray(offset, offset + docSize);
                  mainDoc = BSON.deserialize(docBuf);
                  offset += docSize;
                } else if (kind === 1) {
                  const secSize = packet.readInt32LE(offset);
                  const secEnd = offset + secSize;
                  offset += 4;
                  let cstrEnd = offset;
                  while (cstrEnd < packet.length && packet[cstrEnd] !== 0) cstrEnd++;
                  const identifier = packet.toString('utf8', offset, cstrEnd);
                  offset = cstrEnd + 1;
                  const docs = [];
                  while (offset < secEnd) {
                    const dSize = packet.readInt32LE(offset);
                    const dBuf = packet.subarray(offset, offset + dSize);
                    docs.push(BSON.deserialize(dBuf));
                    offset += dSize;
                  }
                  sectionDocs.set(identifier, docs);
                }
              }

              if (mainDoc) {
                try {
                  const responseDoc = this.handleCommand(mainDoc, sectionDocs);
                  this.sendOpMsg(socket, requestId, responseDoc);
                } catch (cmdErr) {
                  console.error('[EMBEDDED MONGO] Command error:', cmdErr);
                  this.sendOpMsg(socket, requestId, { ok: 0, errmsg: cmdErr.message });
                }
              }
            }
          }
        });

        socket.on('error', () => {});
      });

      this.server.on('error', reject);
      this.server.listen(port, '127.0.0.1', () => {
        resolve(this.port);
      });
    });
  }

  sendOpReply(socket, responseTo, doc) {
    try {
      const docBuf = BSON.serialize(doc);
      const msgLength = 16 + 4 + 8 + 4 + 4 + docBuf.length;
      const packet = Buffer.alloc(msgLength);

      packet.writeInt32LE(msgLength, 0);
      packet.writeInt32LE(this.reqId++, 4);
      packet.writeInt32LE(responseTo, 8);
      packet.writeInt32LE(1, 12); // OP_REPLY

      packet.writeInt32LE(0, 16); // responseFlags
      packet.writeBigInt64LE(0n, 20); // cursorID
      packet.writeInt32LE(0, 28); // startingFrom
      packet.writeInt32LE(1, 32); // numberReturned
      docBuf.copy(packet, 36);

      socket.write(packet);
    } catch (e) {
      console.error('[EMBEDDED MONGO] sendOpReply error:', e);
    }
  }

  sendOpMsg(socket, responseTo, doc) {
    try {
      const docBuf = BSON.serialize(doc);
      const msgLength = 16 + 4 + 1 + docBuf.length;
      const packet = Buffer.alloc(msgLength);

      packet.writeInt32LE(msgLength, 0);
      packet.writeInt32LE(this.reqId++, 4);
      packet.writeInt32LE(responseTo, 8);
      packet.writeInt32LE(2013, 12);
      packet.writeUInt32LE(0, 16);
      packet.writeUInt8(0, 20);
      docBuf.copy(packet, 21);

      socket.write(packet);
    } catch (e) {
      console.error('[EMBEDDED MONGO] sendOpMsg error:', e);
    }
  }

  handleCommand(cmd, sectionDocs) {
    const db = cmd.$db || 'admin';

    if (cmd.hello || cmd.isMaster || cmd.ismaster) {
      return {
        ismaster: true,
        isWritablePrimary: true,
        maxBsonObjectSize: 16777216,
        maxMessageSizeBytes: 48000000,
        maxWriteBatchSize: 100000,
        logicalSessionTimeoutMinutes: 30,
        minWireVersion: 0,
        maxWireVersion: 21,
        readOnly: false,
        localTime: new Date(),
        connectionId: 1,
        ok: 1
      };
    }

    if (cmd.buildInfo || cmd.buildinfo) {
      return {
        version: "7.0.0",
        versionArray: [7, 0, 0, 0],
        ok: 1
      };
    }

    if (cmd.ping) {
      return { ok: 1 };
    }

    if (cmd.saslSupportedMechs) {
      return { saslSupportedMechs: [], ok: 1 };
    }

    if (cmd.endSessions) {
      return { ok: 1 };
    }

    if (cmd.createIndexes || cmd.collMod) {
      return { numIndexesBefore: 1, numIndexesAfter: 2, ok: 1 };
    }

    if (cmd.insert) {
      const coll = this.getCollection(db, cmd.insert);
      const docs = sectionDocs.get('documents') || cmd.documents || [];
      for (const d of docs) {
        if (!d._id) {
          d._id = new BSON.ObjectId();
        }
        coll.push(d);
      }
      return { n: docs.length, ok: 1 };
    }

    if (cmd.find) {
      const coll = this.getCollection(db, cmd.find);
      let filter = cmd.filter || {};
      let filtered = coll.filter(sift(filter));

      if (cmd.sort) {
        const sortKeys = Object.keys(cmd.sort);
        if (sortKeys.length > 0) {
          filtered.sort((a, b) => {
            for (const key of sortKeys) {
              const dir = cmd.sort[key];
              const aVal = a[key];
              const bVal = b[key];
              if (aVal < bVal) return dir === -1 ? 1 : -1;
              if (aVal > bVal) return dir === -1 ? -1 : 1;
            }
            return 0;
          });
        }
      }

      if (cmd.skip) {
        filtered = filtered.slice(cmd.skip);
      }
      if (cmd.limit && cmd.limit > 0) {
        filtered = filtered.slice(0, cmd.limit);
      }

      return {
        cursor: {
          id: new BSON.Long(0),
          ns: `${db}.${cmd.find}`,
          firstBatch: filtered
        },
        ok: 1
      };
    }

    if (cmd.count) {
      const coll = this.getCollection(db, cmd.count);
      const filter = cmd.query || {};
      const filtered = coll.filter(sift(filter));
      return { n: filtered.length, ok: 1 };
    }

    if (cmd.update) {
      const coll = this.getCollection(db, cmd.update);
      const updates = sectionDocs.get('updates') || cmd.updates || [];
      let nModified = 0;
      let nMatched = 0;

      for (const u of updates) {
        const matching = coll.filter(sift(u.q || {}));
        const toUpdate = u.multi ? matching : matching.slice(0, 1);
        nMatched += toUpdate.length;

        for (const item of toUpdate) {
          if (u.u) {
            if (u.u.$set) {
              Object.assign(item, u.u.$set);
            }
            if (u.u.$unset) {
              for (const k of Object.keys(u.u.$unset)) delete item[k];
            }
            if (u.u.$inc) {
              for (const [k, v] of Object.entries(u.u.$inc)) item[k] = (item[k] || 0) + v;
            }
            if (!u.u.$set && !u.u.$unset && !u.u.$inc) {
              const id = item._id;
              Object.keys(item).forEach(k => delete item[k]);
              Object.assign(item, u.u, { _id: id });
            }
            nModified++;
          }
        }

        if (toUpdate.length === 0 && u.upsert) {
          const newItem = { _id: new BSON.ObjectId(), ...(u.q || {}), ...(u.u?.$set || u.u || {}) };
          coll.push(newItem);
          nMatched++;
          nModified++;
        }
      }

      return { n: nMatched, nModified, ok: 1 };
    }

    if (cmd.delete) {
      const coll = this.getCollection(db, cmd.delete);
      const deletes = sectionDocs.get('deletes') || cmd.deletes || [];
      let nDeleted = 0;

      for (const d of deletes) {
        const filter = sift(d.q || {});
        for (let i = coll.length - 1; i >= 0; i--) {
          if (filter(coll[i])) {
            coll.splice(i, 1);
            nDeleted++;
            if (d.limit === 1) break;
          }
        }
      }

      return { n: nDeleted, ok: 1 };
    }

    if (cmd.findAndModify) {
      const coll = this.getCollection(db, cmd.findAndModify);
      const filter = sift(cmd.query || {});
      const matchingIdx = coll.findIndex(filter);

      if (cmd.remove) {
        if (matchingIdx >= 0) {
          const [removed] = coll.splice(matchingIdx, 1);
          return { value: removed, ok: 1 };
        }
        return { value: null, ok: 1 };
      }

      if (matchingIdx >= 0) {
        const item = coll[matchingIdx];
        const old = { ...item };
        if (cmd.update) {
          if (cmd.update.$set) Object.assign(item, cmd.update.$set);
          if (cmd.update.$unset) {
            for (const k of Object.keys(cmd.update.$unset)) delete item[k];
          }
        }
        return { value: cmd.new ? item : old, ok: 1 };
      }

      if (cmd.upsert) {
        const newItem = { _id: new BSON.ObjectId(), ...(cmd.query || {}), ...(cmd.update?.$set || cmd.update || {}) };
        coll.push(newItem);
        return { value: newItem, ok: 1 };
      }

      return { value: null, ok: 1 };
    }

    if (cmd.aggregate) {
      const coll = this.getCollection(db, cmd.aggregate);
      let result = [...coll];
      const pipeline = cmd.pipeline || [];

      for (const stage of pipeline) {
        if (stage.$match) {
          result = result.filter(sift(stage.$match));
        } else if (stage.$group) {
          // Mongoose countDocuments uses $group: { _id: null, n: { $sum: 1 } }
          result = [{ _id: null, n: result.length, count: result.length }];
        } else if (stage.$project) {
          // Keep project result if grouped
          if (result.length === 1 && result[0].n !== undefined) {
            result = [{ n: result[0].n }];
          }
        } else if (stage.$sort) {
          const sortKeys = Object.keys(stage.$sort);
          result.sort((a, b) => {
            for (const key of sortKeys) {
              const dir = stage.$sort[key];
              const aVal = a[key];
              const bVal = b[key];
              if (aVal < bVal) return dir === -1 ? 1 : -1;
              if (aVal > bVal) return dir === -1 ? -1 : 1;
            }
            return 0;
          });
        } else if (stage.$skip) {
          result = result.slice(stage.$skip);
        } else if (stage.$limit) {
          result = result.slice(0, stage.$limit);
        } else if (stage.$count) {
          result = [{ [stage.$count]: result.length }];
        }
      }

      return {
        cursor: {
          id: new BSON.Long(0),
          ns: `${db}.${cmd.aggregate}`,
          firstBatch: result
        },
        ok: 1
      };
    }

    return { ok: 1 };
  }
}

export const startEmbeddedMongo = async (port = 27017) => {
  const server = new EmbeddedMongoServer();
  await server.start(port);
  return server;
};
