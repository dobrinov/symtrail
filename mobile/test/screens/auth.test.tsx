import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { SignInScreen } from "../../src/screens/auth/SignInScreen";

test("submits credentials and calls onSignedIn with the token", async () => {
  const signin = jest.fn(async () => ({ token: "tok", account: { id: 1, email: "a@b.com", settings: { temp_unit: "c" as const } } }));
  const sessionSignedIn = jest.fn(async () => {});
  const onSignedIn = jest.fn();
  await render(
    <SignInScreen api={{ signin } as never} sessionSignedIn={sessionSignedIn} onSignedIn={onSignedIn} goToSignUp={() => {}} goToReset={() => {}} />
  );
  await fireEvent.changeText(screen.getByPlaceholderText("Email"), "a@b.com");
  await fireEvent.changeText(screen.getByPlaceholderText("Password"), "secret123");
  await fireEvent.press(screen.getByText("Sign in"));
  await waitFor(() => expect(onSignedIn).toHaveBeenCalledWith("tok"));
  expect(signin).toHaveBeenCalledWith("a@b.com", "secret123", expect.anything());
  expect(sessionSignedIn).toHaveBeenCalled();
});

test("shows the API error message on failure", async () => {
  const signin = jest.fn(async () => { const e: any = new Error("Invalid email or password"); e.code = "invalid_credentials"; throw e; });
  await render(
    <SignInScreen api={{ signin } as never} sessionSignedIn={async () => {}} onSignedIn={() => {}} goToSignUp={() => {}} goToReset={() => {}} />
  );
  await fireEvent.changeText(screen.getByPlaceholderText("Email"), "a@b.com");
  await fireEvent.changeText(screen.getByPlaceholderText("Password"), "bad");
  await fireEvent.press(screen.getByText("Sign in"));
  expect(await screen.findByText("Invalid email or password")).toBeTruthy();
});
