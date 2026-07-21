import { Module } from "@nestjs/common";
import { ChatController } from "./chat.controller";
import { ChatGateway } from "./chat.gateway";
import { ChatService } from "./chat.service";
import { ChatCryptoService } from "./chat-crypto.service";

@Module({
  controllers: [ChatController],
  providers: [ChatService, ChatCryptoService, ChatGateway],
})
export class ChatModule {}
