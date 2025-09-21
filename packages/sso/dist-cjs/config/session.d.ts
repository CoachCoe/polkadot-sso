import RedisStore from 'connect-redis';
export declare const sessionConfig: {
    store: RedisStore | undefined;
    secret: string;
    name: string;
    cookie: {
        secure: boolean;
        httpOnly: boolean;
        sameSite: "strict";
        maxAge: number;
        path: string;
        domain: string | undefined;
    };
    resave: boolean;
    saveUninitialized: boolean;
    rolling: boolean;
    genid: () => string;
};
//# sourceMappingURL=session.d.ts.map