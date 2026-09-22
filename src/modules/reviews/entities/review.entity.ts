export class Review {
  id!: string;
  userId!: string;
  jobId!: string;
  rating!: number;
  comment?: string;
  createdAt!: Date;
}
