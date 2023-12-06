import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import { Document, Types } from 'mongoose';

@Schema({
    toJSON: {
        virtuals: true,
        transform(doc, ret) {
            delete ret._id;
            delete ret.updatedAt;
            delete ret.isDeletedBySender;
            delete ret.isBlock;
        },
    },
    toObject: {
        virtuals: true,
        transform(doc, ret) {
            doc.id = ret._id;
        },
    },
    versionKey: false,
    timestamps: true,
})
export class PrivateMessage extends Document {

    @Prop({ required: true })
    senderId: string;

    @Prop({ required: true })
    receiverId: string;

    @Prop()
    deleted: string[];

    @Prop({ default: '' })
    text: string;

    @Prop()
    media: Array<any>;

    @Prop()
    sentDate: Date;

    @Prop()
    seenDate: Date;

    @Prop()
    tempId?: string;

    @Prop()
    isBlock: boolean;

    @Prop({ type: Types.ObjectId, ref: 'PrivateMessage' })
    @Type(() => PrivateMessage)
    replayMessage?: PrivateMessage;

    @Prop()
    reactions: Array<Object>;
}

export const PrivateMessageSchema = SchemaFactory.createForClass(PrivateMessage);
