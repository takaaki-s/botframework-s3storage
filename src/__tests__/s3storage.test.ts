import S3Storage from '../s3storage';

jest.mock('aws-sdk');

test('read of unknown key', async () => {
  let AWS = require('aws-sdk');
  AWS.S3 = class S3 {
    getObject() {
      return {
        promise: async () => {
          throw Error('object not found');
        },
      };
    }
  };

  const storage = new S3Storage('bucket');
  expect(await storage.read(['unk'])).toEqual({});
});

test('read of known key', async () => {
  let AWS = require('aws-sdk');
  const mockFunc = jest.fn(() => {
    return {
      promise: async () => {
        return {
          Body: Buffer.from(JSON.stringify({ hoge: 'moge1' })),
          ETag: 'etag1',
        };
      },
    };
  });

  AWS.S3 = class S3 {
    getObject = mockFunc;
  };

  const storage = new S3Storage('bucket');
  expect(await storage.read(['known/key/'])).toEqual({
    'known/key/': { hoge: 'moge1', eTag: 'etag1' },
  });
  expect({ ...mockFunc.mock.calls[0] }[0]).toHaveProperty('Key', 'known/key');
});

test('key creation', async () => {
  let AWS = require('aws-sdk');
  const mockPutObject = jest.fn(() => {
    return {
      promise: async () => {},
    };
  });
  const mockGetObject = jest.fn(() => {
    return {
      promise: async () => {
        throw Error('object not found');
      },
    };
  });

  AWS.S3 = class S3 {
    getObject = mockGetObject;
    putObject = mockPutObject;
  };

  const storage = new S3Storage('bucket');
  expect(await storage.write({ keyCreate: { count: 1 } })).toBeUndefined();
  expect(mockGetObject.mock.calls.length).toBe(1);
  expect(mockPutObject.mock.calls.length).toBe(1);
  expect({ ...mockPutObject.mock.calls[0] }[0]).toHaveProperty(
    'Key',
    'keyCreate'
  );
  expect({ ...mockPutObject.mock.calls[0] }[0]).toHaveProperty(
    'Body',
    JSON.stringify({ count: 1 })
  );
});

test('key update', async () => {
  let AWS = require('aws-sdk');
  const mockPutObject = jest.fn(() => {
    return {
      promise: async () => {},
    };
  });
  const mockGetObject = jest.fn(() => {
    return {
      promise: async () => {
        return {
          Body: Buffer.from(JSON.stringify({ count: 1 })),
          ETag: 'etag1',
        };
      },
    };
  });

  AWS.S3 = class S3 {
    getObject = mockGetObject;
    putObject = mockPutObject;
  };

  const storage = new S3Storage('bucket');
  const item = await storage.read(['known/key/']);
  item['known/key/'].count = 2;

  expect(await storage.write({ ...item })).toBeUndefined();
  expect(mockGetObject.mock.calls.length).toBe(2);
  expect(mockPutObject.mock.calls.length).toBe(1);
  expect({ ...mockPutObject.mock.calls[0] }[0]).toHaveProperty(
    'Key',
    'known/key'
  );
  expect({ ...mockPutObject.mock.calls[0] }[0]).toHaveProperty(
    'Body',
    JSON.stringify({ count: 2, eTag: 'etag1' })
  );
});

test('invalid eTag', async () => {
  let AWS = require('aws-sdk');
  const mockPutObject = jest.fn(() => {
    return {
      promise: async () => {},
    };
  });
  const mockGetObject = jest.fn(() => {
    return {
      promise: async () => {
        return {
          Body: Buffer.from(JSON.stringify({ count: 1 })),
          ETag: 'etag1',
        };
      },
    };
  });

  AWS.S3 = class S3 {
    getObject = mockGetObject;
    putObject = mockPutObject;
  };

  const storage = new S3Storage('bucket');
  const item = await storage.read(['known/key/']);
  item['known/key/'].count = 2;
  item['known/key/'].eTag = 'etag2';

  await expect(storage.write({ ...item })).rejects.toThrowError(/Storage/);
  expect(mockGetObject.mock.calls.length).toBe(2);
  expect(mockPutObject.mock.calls.length).toBe(0);
});

test('wildcard eTag', async () => {
  let AWS = require('aws-sdk');
  const mockPutObject = jest.fn(() => {
    return {
      promise: async () => {},
    };
  });
  const mockGetObject = jest.fn(() => {
    return {
      promise: async () => {
        return {
          Body: Buffer.from(JSON.stringify({ count: 1 })),
          ETag: 'etag1',
        };
      },
    };
  });

  AWS.S3 = class S3 {
    getObject = mockGetObject;
    putObject = mockPutObject;
  };

  const storage = new S3Storage('bucket');
  const item = await storage.read(['known/key/']);
  item['known/key/'].count = 2;
  item['known/key/'].eTag = '*';

  expect(await storage.write({ ...item })).toBeUndefined();
  expect(mockGetObject.mock.calls.length).toBe(2);
  expect(mockPutObject.mock.calls.length).toBe(1);
  expect({ ...mockPutObject.mock.calls[0] }[0]).toHaveProperty(
    'Body',
    JSON.stringify({ count: 2, eTag: '*' })
  );
});

test('delete key', async () => {
  let AWS = require('aws-sdk');
  const mockDeleteObject = jest.fn(() => {
    return {
      promise: async () => {},
    };
  });

  AWS.S3 = class S3 {
    deleteObject = mockDeleteObject;
  };

  const storage = new S3Storage('bucket');

  expect(await storage.delete(['delete/key/'])).toBeUndefined();
  expect(mockDeleteObject.mock.calls.length).toBe(1);
  expect({ ...mockDeleteObject.mock.calls[0] }[0]).toHaveProperty(
    'Key',
    'delete/key'
  );
});

test('batch put operations', async () => {
  let AWS = require('aws-sdk');
  const mockPutObject = jest.fn(() => {
    return {
      promise: async () => {},
    };
  });
  const mockGetObject = jest.fn(() => {
    return {
      promise: async () => {},
    };
  });

  AWS.S3 = class S3 {
    getObject = mockGetObject;
    putObject = mockPutObject;
  };

  const storage = new S3Storage('bucket');

  expect(
    await storage.write({
      batch1: { count: 10 },
      batch2: { count: 20 },
      batch3: { count: 30 },
    })
  ).toBeUndefined();
  expect(mockPutObject.mock.calls.length).toBe(3);
  expect(mockGetObject.mock.calls.length).toBe(3);
  expect({ ...mockGetObject.mock.calls[0] }[0]).toHaveProperty('Key', 'batch1');
  expect({ ...mockGetObject.mock.calls[1] }[0]).toHaveProperty('Key', 'batch2');
  expect({ ...mockGetObject.mock.calls[2] }[0]).toHaveProperty('Key', 'batch3');
  expect({ ...mockPutObject.mock.calls[0] }[0]).toHaveProperty('Key', 'batch1');
  expect({ ...mockPutObject.mock.calls[1] }[0]).toHaveProperty('Key', 'batch2');
  expect({ ...mockPutObject.mock.calls[2] }[0]).toHaveProperty('Key', 'batch3');
  expect({ ...mockPutObject.mock.calls[0] }[0]).toHaveProperty(
    'Body',
    JSON.stringify({
      count: 10,
    })
  );
  expect({ ...mockPutObject.mock.calls[1] }[0]).toHaveProperty(
    'Body',
    JSON.stringify({
      count: 20,
    })
  );
  expect({ ...mockPutObject.mock.calls[2] }[0]).toHaveProperty(
    'Body',
    JSON.stringify({
      count: 30,
    })
  );
});

test('batch read operations', async () => {
  let AWS = require('aws-sdk');
  const mockGetObject = jest
    .fn()
    .mockImplementationOnce(() => {
      return {
        promise: async () => {
          return {
            Body: Buffer.from(JSON.stringify({ count: 10 })),
            ETag: 'etag1',
          };
        },
      };
    })
    .mockImplementationOnce(() => {
      return {
        promise: async () => {
          return {
            Body: Buffer.from(JSON.stringify({ count: 20 })),
            ETag: 'etag2',
          };
        },
      };
    })
    .mockImplementationOnce(() => {
      return {
        promise: async () => {
          return {
            Body: Buffer.from(JSON.stringify({ count: 30 })),
            ETag: 'etag3',
          };
        },
      };
    });

  AWS.S3 = class S3 {
    getObject = mockGetObject;
  };

  const storage = new S3Storage('bucket');
  expect(await storage.read(['batch1', 'batch2', 'batch3'])).toEqual({
    batch1: { count: 10, eTag: 'etag1' },
    batch2: { count: 20, eTag: 'etag2' },
    batch3: { count: 30, eTag: 'etag3' },
  });
  expect(mockGetObject.mock.calls.length).toBe(3);
});

test('batch delete operations', async () => {
  let AWS = require('aws-sdk');
  const mockDeleteObject = jest.fn(() => {
    return {
      promise: async () => {},
    };
  });

  AWS.S3 = class S3 {
    deleteObject = mockDeleteObject;
  };

  const storage = new S3Storage('bucket');
  expect(await storage.delete(['batch1', 'batch2', 'batch3'])).toBeUndefined();
  expect(mockDeleteObject.mock.calls.length).toBe(3);
  expect({ ...mockDeleteObject.mock.calls[0] }[0]).toHaveProperty(
    'Key',
    'batch1'
  );
  expect({ ...mockDeleteObject.mock.calls[1] }[0]).toHaveProperty(
    'Key',
    'batch2'
  );
  expect({ ...mockDeleteObject.mock.calls[2] }[0]).toHaveProperty(
    'Key',
    'batch3'
  );
});
