import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({
    versionKey: false,
    timestamps: false,
})
export class Block extends Document {

    @Prop({ required: true })
    ownerId: string;

    @Prop({ required: true })
    userId: string;
}

export const BlockSchema = SchemaFactory.createForClass(Block);