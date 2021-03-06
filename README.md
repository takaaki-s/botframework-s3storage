# BotFramework S3Storage

これは[BotFramework](https://github.com/Microsoft/botframework)のbotの状態を`MemoryStorage`に代わり、S3に保存するライブラリです。  
AWS上でBotFrameworkをサーバーレスで動かす場合に利用します。

## Installation

```sh
npm install --save botframework-s3storage
```

## Usage

あらかじめストア先のバケットは作成しておきます。
コンストラクタでストア先のバケットを指定します。

```javascript
import S3Storage from 'botframework-s3storage';

const s3Storage = new S3Storage('store-bucket');
```

S3のコンストラクタに渡すオプションを第二引数で指定可能です。  
オプションの詳細はSDKのドキュメントを参照してください。  
https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#constructor-property

```javascript
import S3Storage from 'botframework-s3storage';

const s3Storage = new S3Storage('store-bucket', {
  region: 'ap-northeast-1',
  apiVersion: '2006-03-01',
});
```

## Example

`MemoryStorage`と差し替えるだけです。

```javascript
import S3Storage from 'botframework-s3storage';
import { ConversationState, UserState } from 'botbuilder';

const s3Storage = new S3Storage('YOUR_STORE_BUCKET', {'YOUR_S3_OPTIONS'});
const conversationState = new ConversationState(s3Storage);
const userState = new UserState(s3Storage);

// ...
```

https://github.com/takaaki-s/serverless-botframework