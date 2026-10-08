import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authService } from '../../services/authService';
import { getToken } from '../../services/api';

export type AppRole = 'customer' | 'mechanic' | 'admin';

interface AuthState {
  user: any | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

const normalizeRole = (role?: string | null): AppRole => {
  const normalized = (role ?? '').toString().trim().toLowerCase();

  if (normalized === 'owner' || normalized === 'car_owner' || normalized === 'customer') return 'customer';
  if (normalized === 'mechanic') return 'mechanic';
  if (normalized === 'admin') return 'admin';

  return 'customer';
};

const normalizeAuthPayload = (payload: any) => {
  const rawUser = payload?.user ?? payload ?? null;
  const token = payload?.accessToken ?? payload?.token ?? null;

  return {
    token,
    user: rawUser
      ? {
          ...rawUser,
          id: rawUser.id ?? rawUser.userId ?? '',
          firstName: rawUser.firstName ?? '',
          lastName: rawUser.lastName ?? '',
          email: rawUser.email ?? '',
          phone: rawUser.phone ?? null,
          role: normalizeRole(rawUser.role),
          isActive: rawUser.isActive ?? true,
        }
      : null,
  };
};

const initialState: AuthState = {
  user: null,
  token: null,
  loading: false,
  error: null,
};

export const registerUser = createAsyncThunk(
  'auth/register',
  async (data: { firstName: string; lastName: string; email: string; password: string; phone?: string }, { rejectWithValue }) => {
    try {
      return normalizeAuthPayload(await authService.register(data));
    } catch (error: any) {
      return rejectWithValue(error.message || 'Registration failed');
    }
  }
);

export const verifyRegistrationThunk = createAsyncThunk(
  'auth/verifyRegistration',
  async (data: { firstName?: string; lastName?: string; name?: string; email: string; phone?: string; password: string; role?: string; code?: string }, { rejectWithValue }) => {
    try {
      return normalizeAuthPayload(await authService.verifyRegistration(data));
    } catch (error: any) {
      return rejectWithValue(error.message || 'Verification failed');
    }
  }
);

export const loginUser = createAsyncThunk(
  'auth/login',
  async (data: { email: string; password: string }, { rejectWithValue }) => {
    try {
      return normalizeAuthPayload(await authService.login(data));
    } catch (error: any) {
      return rejectWithValue(error.message || 'Login failed');
    }
  }
);

export const loadStoredUser = createAsyncThunk('auth/loadStoredUser', async () => {
  const [user, token] = await Promise.all([authService.getStoredUser(), getToken()]);
  return { user, token };
});

export const logout = createAsyncThunk('auth/logout', async () => {
  await authService.logout();
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(verifyRegistrationThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyRegistrationThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(verifyRegistrationThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(loadStoredUser.fulfilled, (state, action) => {
        state.user = action.payload.user ?? null;
        state.token = action.payload.token ?? null;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
