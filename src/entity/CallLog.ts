import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class CallLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  callerSocketId: string;

  @Column()
  receiverSocketId: string;

  @Column({ nullable: true })
  status: string; // 'started' | 'ended'

  @CreateDateColumn()
  timestamp: Date;
}
