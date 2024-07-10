export interface FormData {
    firstname: string;
    lastname: string;
    email: string;
    username: string;
    password: string;
    confirmPassword: string
}

export interface FormProps {
    formData: FormData;
    errors: FormData;
    onInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onPrevious: () => void;
    onNext: () => void;
}