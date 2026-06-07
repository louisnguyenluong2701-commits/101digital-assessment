import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Unique email, used as the login identifier. */
  @Index({ unique: true })
  @Column({ unique: true })
  email: string;

  /** Bcrypt-hashed password. Never returned to clients. */
  @Column()
  passwordHash: string;

  /** Display name. */
  @Column()
  fullname: string;

  @CreateDateColumn()
  createdAt: Date;
}
