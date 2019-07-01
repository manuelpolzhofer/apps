import { AnyAction, Action } from 'redux';
import Tinlake, { Loan, BalanceDebt } from 'tinlake';
// tslint:disable-next-line:import-name
import BN from 'bn.js';
import getLoanStatus from '../utils/getLoanStatus';
import { ThunkAction } from 'redux-thunk';

// Actions
const LOAD = 'tinlake-ui/loans/LOAD';
const RECEIVE = 'tinlake-ui/loans/RECEIVE';
const LOAD_SINGLE = 'tinlake-ui/loans/LOAD_SINGLE';
const LOAD_SINGLE_NOT_FOUND = 'tinlake-ui/loans/LOAD_SINGLE_NOT_FOUND';
const RECEIVE_SINGLE = 'tinlake-ui/loans/RECEIVE_SINGLE';

export interface InternalLoan extends Loan {
  loanId: number;
  balance: BN;
  debt: BN;
  status: string;
}

export interface LoansState {
  loansState: null | 'loading' | 'found';
  loans: InternalLoan[];
  singleLoanState: null | 'loading' | 'not found' | 'found';
  singleLoan: null | InternalLoan;
}

const initialState: LoansState = {
  loansState: null,
  loans: [],
  singleLoanState: null,
  singleLoan: null,
};

// Reducer
export default function reducer(state: LoansState = initialState,
                                action: AnyAction = { type: '' }): LoansState {
  switch (action.type) {
    case LOAD: return { ...state, loansState: 'loading' };
    case RECEIVE: return { ...state, loansState: 'found', loans: action.loans };
    case LOAD_SINGLE: return { ...state, singleLoanState: 'loading' };
    case LOAD_SINGLE_NOT_FOUND: return { ...state, singleLoanState: 'not found' };
    case RECEIVE_SINGLE: return { ...state, singleLoanState: 'found', singleLoan: action.loan };
    default: return state;
  }
}

// side effects, only as applicable
// e.g. thunks, epics, etc
export function getLoans(tinlake: Tinlake):
  ThunkAction<Promise<void>, LoansState, undefined, Action>  {
  return async (dispatch) => {
    dispatch({ type: LOAD });

    const count = await tinlake.loanCount();

    const loanPromises: Promise<Loan>[] = [];
    const balanceDebtPromises: Promise<BalanceDebt>[] = [];

    for (let i = 0; i < count.toNumber(); i += 1) {
      loanPromises.push(tinlake.getLoan(i));
      balanceDebtPromises.push(tinlake.getBalanceDebt(i));
    }

    const loans = await Promise.all(loanPromises);
    const balanceDebtData = await Promise.all(balanceDebtPromises);

    const extendedLoansData = loans.map((loan, i) => {
      return ({
        loanId: i,
        principal: loan.principal,
        price: loan.price,
        registry: loan.registry,
        tokenId: loan.tokenId,
        balance: balanceDebtData[i].balance,
        debt: balanceDebtData[i].debt,
        status: getLoanStatus(loan.principal, balanceDebtData[i].debt),
      });
    });

    dispatch({ type: RECEIVE, loans: extendedLoansData });
  };
}

export function getLoan(tinlake: Tinlake, loanId: number):
  ThunkAction<Promise<void>, LoansState, undefined, Action> {
  return async (dispatch) => {
    dispatch({ type: LOAD_SINGLE });

    const count = await tinlake.loanCount();

    if (count.toNumber() <= loanId) {
      dispatch({ type: LOAD_SINGLE_NOT_FOUND });
    }

    const [loan, balanceDebtData] = await Promise.all([
      tinlake.getLoan(loanId),
      tinlake.getBalanceDebt(loanId),
    ]);

    const extendedLoanData = {
      loanId,
      principal: loan.principal,
      price: loan.price,
      registry: loan.registry,
      tokenId: loan.tokenId,
      balance: balanceDebtData.balance,
      debt: balanceDebtData.debt,
      status: getLoanStatus(loan.principal, balanceDebtData.debt),
    };

    dispatch({ type: RECEIVE_SINGLE, loan: extendedLoanData });
  };
}
